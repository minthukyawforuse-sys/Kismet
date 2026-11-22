const fs = require("fs");
const { execSync } = require("child_process");
global.KISMET_RUN = (cmd, cwd) => execSync(cmd, { stdio: "inherit", cwd: cwd || process.cwd() });
global.KISMET_ALL_FILES = fs.readdirSync(".");
require("./build-part2.js");
require("./build-part3.js");
require("./build-part3b.js");
console.log("SUCCESS: KISMET.apk built!");
