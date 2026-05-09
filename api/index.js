const path = require("path");

process.chdir(path.join(process.cwd(), "games"));

module.exports = require("../games/api/index.js");
