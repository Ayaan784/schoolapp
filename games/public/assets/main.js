const grid = document.querySelector("#game-grid");

/**
 * Catalog loads from GET /api/games (Node, Netlify, Vercel), which scans the games folder for .html files.
 * If that endpoint is unavailable (e.g. purely static hosting with no serverless route), we fall back to
 * /games/index.json — maintain that file by hand or regenerate it with: node games/scripts/generate-games-index.js
 */
async function loadCatalogGames() {
  try {
    const res = await fetch("/api/games", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.games)) return data.games;
    }
  } catch {
    /* try manifest below */
  }

  try {
    const res = await fetch("/games/index.json", { credentials: "same-origin" });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.games)) return data.games;
  } catch {
    return [];
  }
  return [];
}

function renderGameCards(games) {
  games.forEach((game) => {
    const card = document.createElement("article");
    const color = game.color || "coral";
    const description = game.description || "Play this game from the catalog.";
    card.className = `game-card ${color}`;
    card.innerHTML = `
    <div class="game-card-art" aria-hidden="true">
      <img src="${game.thumbnail || "/assets/game-thumbnail.png"}" alt="" loading="lazy">
    </div>
    <div class="game-card-body">
      <h3>${game.name}</h3>
      <p>${description}</p>
      <a href="${game.page}">Play</a>
    </div>
  `;
    grid.append(card);
  });
}

loadCatalogGames().then((games) => {
  if (!games.length) {
    grid.innerHTML =
      '<p class="catalog-empty" style="grid-column: 1 / -1; margin: 0; color: var(--muted);">No games found. Add <code>.html</code> files under <code>/games</code>, or provide a <code>/games/index.json</code> manifest.</p>';
    return;
  }
  renderGameCards(games);
});
