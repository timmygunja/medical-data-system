const util = require("util");
const exec = util.promisify(require("child_process").exec);
const axios = require("axios");

const services = {
  backend: 5000,
  audit: 3001,
  auth: 3003,
  encryption: 3002,
};

let totalRequests = 0;

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateRandomDate(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  )
    .toISOString()
    .split("T")[0];
}

function generateRandomName() {
  const firstNames = [
    "John",
    "Jane",
    "Mike",
    "Emily",
    "David",
    "Sarah",
    "Chris",
    "Laura",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
    lastNames[Math.floor(Math.random() * lastNames.length)]
  }`;
}

async function executeCommand(command) {
  try {
    const { stdout, stderr } = await exec(command);
    if (stderr && !stderr.includes("Total")) console.error("stderr:", stderr);
    return stdout.trim();
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function makeRequest(service, port) {
  const randomId = generateRandomString(8);
  const randomName = generateRandomName();
  const randomDate = generateRandomDate(new Date(1950, 0, 1), new Date());

  let endpoint, data;

  switch (service) {
    case "backend":
      endpoint = "/api/patients";
      data = {
        patientId: randomId,
        name: randomName,
        dateOfBirth: randomDate,
        medicalHistory: [
          {
            diagnosis: generateRandomString(10),
            date: generateRandomDate(new Date(2020, 0, 1), new Date()),
            treatment: generateRandomString(15),
            doctor: generateRandomName(),
            notes: generateRandomString(30),
          },
        ],
      };
      break;
    case "auth":
      endpoint = "/register";
      data = {
        username: generateRandomString(8),
        password: generateRandomString(12),
      };
      break;
    case "encryption":
      endpoint = "/encrypt";
      data = {
        text: generateRandomString(20),
      };
      break;
    case "audit":
      endpoint = "/log";
      data = {
        action: ["create", "read", "update", "delete"][
          Math.floor(Math.random() * 4)
        ],
        user: generateRandomString(8),
        data: generateRandomString(20),
      };
      break;
  }

  try {
    const response = await axios.post(
      `http://localhost:${port}${endpoint}`,
      data
    );
    console.log(`${service} request successful:`, response.status);
    totalRequests++;
  } catch (error) {
    console.error(`${service} request failed:`, error.message);
  }
}

async function loadTest() {
  console.log("Starting load test...");

  const startTime = Date.now();
  const duration = 60000; // 1 minute

  while (Date.now() - startTime < duration) {
    const service =
      Object.keys(services)[
        Math.floor(Math.random() * Object.keys(services).length)
      ];
    await makeRequest(service, services[service]);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * 1000) + 500)
    ); // Random delay between 500ms and 1500ms
  }

  console.log(`Load test completed. Total requests made: ${totalRequests}`);

  // Check service health after load test
  console.log("\nChecking service health...");
  for (const [service, port] of Object.entries(services)) {
    const healthCheck = await executeCommand(
      `curl -s http://localhost:${port}/health`
    );
    console.log(`${service} health: ${healthCheck}`);
  }

  // Check Prometheus targets
  console.log("\nChecking Prometheus targets...");
  const prometheusTargets = await executeCommand(
    "curl -s http://localhost:9090/api/v1/targets"
  );
  console.log("Prometheus Targets:", prometheusTargets);
}

loadTest();
