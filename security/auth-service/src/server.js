const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const winston = require("winston");
const promClient = require("prom-client");
const mongoose = require("mongoose");
const User = require("./models/user");

const app = express();
const port = process.env.PORT || 3003;

// MongoDB connection
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

// Prometheus metrics setup
const register = new promClient.Registry();
const authCounter = new promClient.Counter({
  name: "auth_operations_total",
  help: "Total number of authentication operations",
  labelNames: ["operation_type"],
});
const authDuration = new promClient.Histogram({
  name: "auth_operation_duration_seconds",
  help: "Duration of authentication operations",
  labelNames: ["operation_type"],
});
const authErrors = new promClient.Counter({
  name: "auth_errors_total",
  help: "Total number of authentication errors",
  labelNames: ["operation_type", "error_type"],
});

register.registerMetric(authCounter);
register.registerMetric(authDuration);
register.registerMetric(authErrors);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "auth-service" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "auth.log" }),
  ],
});

app.use(express.json());

app.post("/register", async (req, res) => {
  const start = Date.now();
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      password: hashedPassword,
    });
    await user.save();
    logger.info("User registered", { username: user.username });
    authCounter.inc({ operation_type: "register" });
    res.status(201).send(`User with nickname ${user.username} is registered`);
  } catch (error) {
    authErrors.inc({ operation_type: "register", error_type: error.name });
    logger.error("Registration error", { error: error.message });
    res.status(500).send("Registration failed");
  } finally {
    authDuration.observe(
      { operation_type: "register" },
      (Date.now() - start) / 1000
    );
  }
});

app.post("/login", async (req, res) => {
  const start = Date.now();
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user == null) {
      authErrors.inc({ operation_type: "login", error_type: "user_not_found" });
      return res.status(400).send("Cannot find user");
    }
    if (await bcrypt.compare(req.body.password, user.password)) {
      const accessToken = jwt.sign(
        { username: user.username },
        process.env.JWT_SECRET
      );
      logger.info("User logged in", { username: user.username });
      authCounter.inc({ operation_type: "login" });
      res.json({ accessToken: accessToken });
    } else {
      authErrors.inc({
        operation_type: "login",
        error_type: "invalid_password",
      });
      res.status(401).send("Not Allowed");
    }
  } catch (error) {
    authErrors.inc({ operation_type: "login", error_type: error.name });
    logger.error("Login error", { error: error.message });
    res.status(500).send("Login failed");
  } finally {
    authDuration.observe(
      { operation_type: "login" },
      (Date.now() - start) / 1000
    );
  }
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/health", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.status(200).send("Auth service is healthy");
    logger.info("Auth service is healthy");
  } catch (error) {
    logger.error("Error accessing Auth service", { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  logger.info(`Authentication service running on port ${port}`);
});
