const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function runContainerLocally() {
  try {
    const { stdout, stderr } = await exec(
      "docker run -p 5000:5000 medical-data-backend:latest"
    );
    console.log("Container output:");
    console.log(stdout);

    if (stderr) {
      console.error("Error:", stderr);
    }
  } catch (error) {
    console.error("Error executing command:", error);
  }
}

runContainerLocally();
