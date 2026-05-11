const fs = require("fs");
const path = require("path");
const { listHtmlGames } = require("../lib/games-catalog");

const publicDir = path.join(__dirname, "..", "public");
const games = listHtmlGames(publicDir);
const outPath = path.join(publicDir, "games", "index.json");
fs.writeFileSync(outPath, `${JSON.stringify({ games }, null, 2)}\n`, "utf8");
console.log(`Wrote ${games.length} game(s) to ${path.relative(process.cwd(), outPath)}`);
