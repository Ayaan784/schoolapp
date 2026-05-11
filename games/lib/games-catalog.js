const fs = require("fs");
const path = require("path");

const COLOR_CYCLE = ["coral", "sky", "leaf", "gold", "mint", "plum", "teal", "berry"];

function formatGameTitle(filenameStem) {
  return filenameStem
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Lists playable HTML games under publicDir/games (or FRIEND_GAMES_FOLDER).
 * Each entry is suitable for the home catalog: page URL, display name, accent color, short blurb.
 */
function listHtmlGames(publicDir, options = {}) {
  const subdir = (options.gamesSubdir || process.env.FRIEND_GAMES_FOLDER || "games").replace(/^\/+|\/+$/g, "");
  const gamesDir = path.join(publicDir, subdir);
  if (!fs.existsSync(gamesDir) || !fs.statSync(gamesDir).isDirectory()) {
    return [];
  }

  const urlPrefix = `/${subdir.replace(/\\/g, "/")}`;

  const entries = fs
    .readdirSync(gamesDir)
    .filter((name) => {
      if (!name.endsWith(".html") || name.toLowerCase() === "index.html") return false;
      const full = path.join(gamesDir, name);
      return fs.statSync(full).isFile();
    })
    .map((name) => {
      const stem = path.basename(name, ".html");
      return {
        page: `${urlPrefix}/${encodeURIComponent(stem)}.html`,
        name: formatGameTitle(stem),
        description: "Play this game from the catalog."
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  entries.forEach((entry, index) => {
    entry.color = COLOR_CYCLE[index % COLOR_CYCLE.length];
  });

  return entries;
}

module.exports = { listHtmlGames, formatGameTitle, COLOR_CYCLE };
