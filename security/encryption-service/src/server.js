const express = require("express");
const CryptoJS = require("crypto-js");
const winston = require("winston");
const promClient = require("prom-client");

// Prometheus metrics setup
const register = new promClient.Registry();
const encryptionCounter = new promClient.Counter({
  name: "encryption_operations_total",
  help: "Total number of encryption operations",
  labelNames: ["operation_type"],
});
const encryptionDuration = new promClient.Histogram({
  name: "encryption_operation_duration_seconds",
  help: "Duration of encryption operations",
  labelNames: ["operation_type"],
});
const encryptionErrors = new promClient.Counter({
  name: "encryption_errors_total",
  help: "Total number of encryption errors",
  labelNames: ["operation_type", "error_type"],
});

register.registerMetric(encryptionCounter);
register.registerMetric(encryptionDuration);
register.registerMetric(encryptionErrors);

const app = express();
const port = process.env.PORT || 3002;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "encryption-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "encryption.log" }),
  ],
});

app.use(express.json());

const secretKey = process.env.ENCRYPTION_KEY || "defaultSecretKey";

function encrypt(text) {
  try {
    const start = Date.now();
    const encrypted = CryptoJS.AES.encrypt(text, secretKey).toString();
    encryptionDuration.observe(
      { operation_type: "encrypt" },
      (Date.now() - start) / 1000
    );
    encryptionCounter.inc({ operation_type: "encrypt" });
    return { content: encrypted };
  } catch (error) {
    encryptionErrors.inc({ operation_type: "encrypt", error_type: error.name });
    throw error;
  }
}

function decrypt(hash) {
  try {
    const start = Date.now();
    const decrypted = CryptoJS.AES.decrypt(hash.content, secretKey).toString(
      CryptoJS.enc.Utf8
    );
    encryptionDuration.observe(
      { operation_type: "decrypt" },
      (Date.now() - start) / 1000
    );
    encryptionCounter.inc({ operation_type: "decrypt" });
    return decrypted;
  } catch (error) {
    encryptionErrors.inc({ operation_type: "decrypt", error_type: error.name });
    throw error;
  }
}

app.post("/encrypt", (req, res) => {
  try {
    const { text } = req.body;
    logger.info("Encrypting data");
    const encrypted = encrypt(text);
    res.json(encrypted);
  } catch (error) {
    logger.error("Encryption error", { error: error.message });
    res.status(500).json({ error: "Encryption failed" });
  }
});

app.post("/decrypt", (req, res) => {
  try {
    const { content } = req.body;
    logger.info("Decrypting data");
    const decrypted = decrypt({ content });
    res.json({ decrypted });
  } catch (error) {
    logger.error("Decryption error", { error: error.message });
    res.status(500).json({ error: "Decryption failed" });
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/health", async (req, res) => {
  try {
    await res.status(200).send("Encryption service is healthy");
    logger.info("Encryption service is healthy");
  } catch (error) {
    logger.error("Error accessing Encryption service", {
      error: error.message,
    });
    await res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  logger.info(`Encryption service running on port ${port}`);
});
