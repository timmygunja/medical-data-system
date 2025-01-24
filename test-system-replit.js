const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function executeCommand(command) {
  try {
    const { stdout, stderr } = await exec(command);
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    return null;
  }
}

async function testSystem() {
  try {
    console.log("Checking service health...");
    const services = {
      backend: 5000,
      audit: 3001,
      auth: 3003,
      encryption: 3002,
    };

    for (const [service, port] of Object.entries(services)) {
      const healthCheck = await executeCommand(
        `curl -s https://${REPL_SLUG}.${REPL_OWNER}.repl.co:${port}/health`
      );
      console.log(`${service} health: ${healthCheck}`);
    }

    console.log("\n1. Creating new patient...");
    const patientData = {
      patientId: "P001",
      name: "Иван Иванов",
      dateOfBirth: "2000-01-01",
      medicalHistory: [
        {
          diagnosis: "Недосып",
          date: "2025-01-01",
          treatment: "Сон",
          doctor: "Постель",
          notes: "Некоторая информирующая записка",
        },
      ],
    };

    const createResponse = await executeCommand(`
      curl -X POST -H "Content-Type: application/json" -d '${JSON.stringify(
        patientData
      )}' https://${REPL_SLUG}.${REPL_OWNER}.repl.co:5000/api/patients
    `);
    console.log("Create Response:", createResponse);

    console.log("\n2. Testing encryption...");
    const encryptResponse = await executeCommand(`
      curl -X POST -H "Content-Type: application/json" -d '{"text":"Confidential medical notes"}' https://${REPL_SLUG}.${REPL_OWNER}.repl.co:3002/encrypt
    `);
    console.log("Encrypt Response:", encryptResponse);

    console.log("\n3. Testing metrics endpoints...");
    const prometheusTargets = await executeCommand(
      "curl -s https://${REPL_SLUG}.${REPL_OWNER}.repl.co:9090/api/v1/targets"
    );
    console.log("Prometheus Targets:", prometheusTargets);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSystem();
