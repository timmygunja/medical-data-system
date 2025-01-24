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

async function verifyServices() {
  try {
    // Test Auth Service
    console.log("Testing Auth Service...");

    const registerCommand = `curl -s -X POST -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass"}' http://localhost:3003/register`;
    const registerResponse = await executeCommand(registerCommand);
    console.log("Register Response:", registerResponse || "No response");

    const loginCommand = `curl -s -X POST -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass"}' http://localhost:3003/login`;
    const loginResponse = await executeCommand(loginCommand);
    console.log("Login Response:", loginResponse || "No response");

    if (loginResponse) {
      try {
        const loginData = JSON.parse(loginResponse);
        console.log("JWT Token:", loginData.accessToken);
      } catch (error) {
        console.error("Error parsing login response:", error.message);
      }
    } else {
      console.log("No JWT Token available");
    }

    // Test Encryption Service
    console.log("\nTesting Encryption Service...");

    const encryptCommand = `curl -s -X POST -H "Content-Type: application/json" -d '{"text":"sensitive data"}' http://localhost:3002/encrypt`;
    const encryptResponse = await executeCommand(encryptCommand);
    console.log("Encrypt Response:", encryptResponse || "No response");

    if (encryptResponse) {
      try {
        const encryptData = JSON.parse(encryptResponse);
        const decryptCommand = `curl -s -X POST -H "Content-Type: application/json" -d '${JSON.stringify(
          encryptData
        )}' http://localhost:3002/decrypt`;
        const decryptResponse = await executeCommand(decryptCommand);
        console.log("Decrypt Response:", decryptResponse || "No response");
      } catch (error) {
        console.error("Error processing encryption response:", error.message);
      }
    }

    // Test Audit Service
    console.log("\nTesting Audit Service...");

    const auditCommand = `curl -s -X POST -H "Content-Type: application/json" -d '{"action":"test","user":"testuser","data":"test data"}' http://localhost:3001/log`;
    const auditResponse = await executeCommand(auditCommand);
    console.log("Audit Log Response:", auditResponse || "No response");
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

verifyServices();
