const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function checkEnvironmentVariables() {
  try {
    const { stdout, stderr } = await exec(
      "kubectl describe pods -n medical-system"
    );
    console.log("Environment variables:");
    console.log(stdout);

    if (stderr) {
      console.error("Error:", stderr);
    }
  } catch (error) {
    console.error("Error executing command:", error);
  }
}

checkEnvironmentVariables();
