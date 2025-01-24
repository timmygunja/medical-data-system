const util = require("util");
const exec = util.promisify(require("child_process").exec);

const podsToCheck = [
  "backend",
  "audit-service",
  "auth-service",
  "encryption-service",
  // "mongodb",
];

async function checkPodLogs(podName) {
  try {
    const command = `kubectl logs -n medical-system deployment/${podName}`;
    const { stdout, stderr } = await exec(command);
    console.log(`Logs for ${podName}:`);
    if (stdout) {
      console.log(stdout);
    } else {
      console.log("No logs found for this pod.");
    }
    if (stderr) {
      console.error(`Error getting logs for ${podName}:`, stderr);
    }
  } catch (error) {
    console.error(`Error executing command for ${podName}:`, error);
  }
}

async function checkAllPodLogs() {
  for (const podName of podsToCheck) {
    await checkPodLogs(podName);
    console.log("--------------------");
  }
}

checkAllPodLogs();
