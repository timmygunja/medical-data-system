const express = require("express");
const winston = require("winston");
const promClient = require("prom-client");

const app = express();
const port = process.env.PORT || 3001;

// Prometheus metrics setup
const register = new promClient.Registry();
const auditCounter = new promClient.Counter({
  name: "audit_logs_total",
  help: "Total number of audit logs",
  labelNames: ["action"],
});
const auditDuration = new promClient.Histogram({
  name: "audit_log_duration_seconds",
  help: "Duration of audit log operations",
});
const auditErrors = new promClient.Counter({
  name: "audit_errors_total",
  help: "Total number of audit errors",
});

register.registerMetric(auditCounter);
register.registerMetric(auditDuration);
register.registerMetric(auditErrors);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "audit-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "audit.log" }),
  ],
});

app.use(express.json());

app.post("/log", (req, res) => {
  const { action, user, data } = req.body;
  logger.info("Audit log", { action, user, data });
  res.sendStatus(200);
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/health", async (req, res) => {
  try {
    await res.status(200).send("Auth service is healthy");
    logger.info("Audit service is healthy");
  } catch (error) {
    logger.error("Error accessing Audit service", { error: error.message });
    await res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  logger.info(`Audit service running on port ${port}`);
});
