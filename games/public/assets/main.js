const grid = document.querySelector("#game-grid");

window.FRIEND_GAMES.forEach((game) => {
  const card = document.createElement("article");
  card.className = `game-card ${game.color}`;
  card.innerHTML = `
    <div class="game-card-art" aria-hidden="true">
      <img src="${game.thumbnail || "/assets/game-thumbnail.png"}" alt="" loading="lazy">
    </div>
    <div class="game-card-body">
      <h3>${game.name}</h3>
      <p>${game.description}</p>
      <a href="${game.page}">Play</a>
    </div>
  `;
  grid.append(card);
});
