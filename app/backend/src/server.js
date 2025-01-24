const express = require("express");
const mongoose = require("mongoose");
const winston = require("winston");
const promClient = require("prom-client");
const rateLimit = require("express-rate-limit");
const Patient = require("./models/patient");

// Prometheus metrics setup
const register = new promClient.Registry();
const requestCounter = new promClient.Counter({
  name: "medical_api_requests_total",
  help: "Total number of API requests",
  labelNames: ["method", "endpoint", "status"],
});
const requestDuration = new promClient.Histogram({
  name: "medical_api_request_duration_seconds",
  help: "API request duration",
  labelNames: ["method", "endpoint"],
});

register.registerMetric(requestCounter);
register.registerMetric(requestDuration);

// Rate limiting setup
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: function (req, res) {
    requestCounter.inc({ method: req.method, endpoint: req.path, status: 429 });
    res.status(429).json({
      error: "Too many requests, please try again later.",
    });
  },
});

const app = express();
const port = process.env.PORT || 5000;

// Logging setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "medical-data-backend" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

app.use(express.json());
app.use(limiter);

// Подключение к MongoDB
mongoose
  .connect(
    "mongodb+srv://turusov13:4diXHu8FgTwjWGv9@cluster0.fb4pw.mongodb.net/",
    // process.env.MONGODB_URI || "mongodb://localhost:27017/medical_data",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Middleware to measure request duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    requestDuration.observe(
      { method: req.method, endpoint: req.path },
      duration
    );
    requestCounter.inc({
      method: req.method,
      endpoint: req.path,
      status: res.statusCode,
    });
  });
  next();
});

// CRUD Operations
app.post("/api/patients", async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    logger.info("Patient created", { patientId: patient.patientId });
    res.status(201).json(patient);
  } catch (error) {
    logger.error("Error creating patient", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/patients/:id", async (req, res) => {
  try {
    const patient = await Patient.findOne({ patientId: req.params.id });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    res.json(patient);
  } catch (error) {
    logger.error("Error fetching patient", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/patients/:id", async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { patientId: req.params.id },
      req.body,
      { new: true }
    );
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    logger.info("Patient updated", { patientId: patient.patientId });
    res.json(patient);
  } catch (error) {
    logger.error("Error updating patient", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/patients/:id", async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({
      patientId: req.params.id,
    });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    logger.info("Patient deleted", { patientId: req.params.id });
    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting patient", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error("Server error:", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await res.status(200).send("Backend service is healthy");
    logger.info("Backend service is healthy");
  } catch (error) {
    logger.error("Error accessing Backend service", { error: error.message });
    await res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  logger.info(`Backend service running on port ${port}`);
});
