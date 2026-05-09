const FriendGames = (() => {
  const root = () => document.querySelector("#game-root");
  const set = (html) => {
    const currentRoot = root();
    const freshRoot = currentRoot.cloneNode(false);
    currentRoot.replaceWith(freshRoot);
    freshRoot.innerHTML = html;
  };
  const status = (text) => { document.querySelector("[data-status]").textContent = text; };
  const restartButton = () => `<div class="game-actions"><button type="button" data-restart>New Game</button></div>`;

  function linesFor(size) {
    const lines = [];
    for (let row = 0; row < size; row++) lines.push([...Array(size)].map((_, col) => row * size + col));
    for (let col = 0; col < size; col++) lines.push([...Array(size)].map((_, row) => row * size + col));
    lines.push([...Array(size)].map((_, i) => i * size + i));
    lines.push([...Array(size)].map((_, i) => i * size + (size - i - 1)));
    return lines;
  }

  function renderTicTacToe() {
    let board = Array(9).fill("");
    let turn = "X";
    let over = false;
    let botEnabled = false;
    let winningLine = [];
    set(`
      <div class="game-status">
        <p data-status>Player X's turn</p>
        <label class="bot-toggle"><input type="checkbox" data-bot-toggle /> Play O as bot</label>
      </div>
      <div class="ttt-grid">${board.map((_, i) => `<button class="cell" data-cell="${i}"></button>`).join("")}</div>
      ${restartButton()}
    `);

    const draw = () => {
      document.querySelectorAll("[data-cell]").forEach((button, i) => {
        button.textContent = board[i];
        button.classList.toggle("win", winningLine.includes(i));
      });
      const winner = linesFor(3).find((line) => line.every((i) => board[i] && board[i] === board[line[0]]));
      if (winner) {
        over = true;
        winningLine = winner;
        document.querySelectorAll("[data-cell]").forEach((button, i) => button.classList.toggle("win", winningLine.includes(i)));
        status(`Player ${board[winner[0]]} wins!`);
      } else if (board.every(Boolean)) {
        over = true;
        status("It is a draw.");
      } else {
        status(`Player ${turn}'s turn`);
      }
    };
    const bestMove = () => {
      const lines = linesFor(3);
      const empty = board.map((value, index) => value ? null : index).filter((index) => index !== null);
      const winningMove = (piece) => empty.find((index) => {
        const testBoard = [...board];
        testBoard[index] = piece;
        return lines.some((line) => line.every((i) => testBoard[i] === piece));
      });
      return winningMove("O") ?? winningMove("X") ?? (board[4] ? null : 4) ?? [0, 2, 6, 8].find((i) => !board[i]) ?? empty[0];
    };
    const botMove = () => {
      if (!botEnabled || over || turn !== "O") return;
      const index = bestMove();
      if (index === undefined) return;
      board[index] = "O";
      turn = "X";
      draw();
    };

    root().addEventListener("click", (event) => {
      const button = event.target.closest("[data-cell]");
      if (!button || over || (botEnabled && turn === "O")) return;
      const index = Number(button.dataset.cell);
      if (board[index]) return;
      board[index] = turn;
      turn = turn === "X" ? "O" : "X";
      draw();
      setTimeout(botMove, 280);
    });
    document.querySelector("[data-bot-toggle]").addEventListener("change", (event) => {
      botEnabled = event.target.checked;
      status(botEnabled ? "Bot enabled. Player X starts." : `Player ${turn}'s turn`);
      setTimeout(botMove, 280);
    });
    document.querySelector("[data-restart]").addEventListener("click", renderTicTacToe);
  }

  function renderConnectFour() {
    const rows = 6;
    const cols = 7;
    let board = Array.from({ length: rows }, () => Array(cols).fill(""));
    let turn = "red";
    let over = false;
    let botEnabled = false;
    let winningCells = [];
    set(`
      <div class="game-status">
        <p data-status>Red's turn</p>
        <label class="bot-toggle"><input type="checkbox" data-bot-toggle /> Play Yellow as bot</label>
      </div>
      <div class="connect-grid">${Array.from({ length: rows * cols }, (_, i) => `<button class="disc" data-col="${i % cols}" aria-label="Column ${(i % cols) + 1}"></button>`).join("")}</div>
      ${restartButton()}
    `);

    const winningSet = (color) => {
      const dirs = [[1,0],[0,1],[1,1],[1,-1]];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (board[r][c] !== color) continue;
          for (const [dr, dc] of dirs) {
            const cells = [0,1,2,3].map((step) => [r + dr * step, c + dc * step]);
            if (cells.every(([cellRow, cellCol]) => board[cellRow]?.[cellCol] === color)) return cells.map(([cellRow, cellCol]) => cellRow * cols + cellCol);
          }
        }
      }
      return [];
    };
    const hasWin = (color) => winningSet(color).length > 0;
    const draw = () => {
      document.querySelectorAll(".disc").forEach((disc, i) => {
        const color = board[Math.floor(i / cols)][i % cols];
        disc.className = `disc ${color}`;
        disc.classList.toggle("win", winningCells.includes(i));
      });
    };
    const availableColumns = () => [...Array(cols).keys()].filter((col) => !board[0][col]);
    const dropRow = (col) => [...Array(rows).keys()].reverse().find((r) => !board[r][col]);
    const wouldWin = (col, color) => {
      const row = dropRow(col);
      if (row === undefined) return false;
      board[row][col] = color;
      const win = hasWin(color);
      board[row][col] = "";
      return win;
    };
    const botColumn = () => {
      const options = availableColumns();
      const botWin = options.find((col) => wouldWin(col, "yellow"));
      if (botWin !== undefined) return botWin;
      const blockRed = options.find((col) => wouldWin(col, "red"));
      if (blockRed !== undefined) return blockRed;
      return [3, 2, 4, 1, 5, 0, 6].find((col) => options.includes(col));
    };
    const playColumn = (col) => {
      const row = dropRow(col);
      if (row === undefined) return;
      board[row][col] = turn;
      draw();
      const win = winningSet(turn);
      if (win.length) {
        winningCells = win;
        draw();
        status(`${turn === "red" ? "Red" : "Yellow"} wins!`);
        over = true;
      } else if (board.flat().every(Boolean)) {
        status("The board is full. Draw!");
        over = true;
      } else {
        turn = turn === "red" ? "yellow" : "red";
        status(`${turn === "red" ? "Red" : "Yellow"}'s turn`);
      }
    };
    const botMove = () => {
      if (!botEnabled || over || turn !== "yellow") return;
      const col = botColumn();
      if (col === undefined) return;
      playColumn(col);
    };
    root().addEventListener("click", (event) => {
      const disc = event.target.closest("[data-col]");
      if (!disc || over || (botEnabled && turn === "yellow")) return;
      const col = Number(disc.dataset.col);
      playColumn(col);
      setTimeout(botMove, 360);
    });
    document.querySelector("[data-bot-toggle]").addEventListener("change", (event) => {
      botEnabled = event.target.checked;
      status(botEnabled ? "Bot enabled. Red starts." : `${turn === "red" ? "Red" : "Yellow"}'s turn`);
      setTimeout(botMove, 360);
    });
    document.querySelector("[data-restart]").addEventListener("click", renderConnectFour);
  }

  function renderRps() {
    const choices = [
      { name: "Rock", mark: "Stone" },
      { name: "Paper", mark: "Page" },
      { name: "Scissors", mark: "Cut" }
    ];
    set(`<div class="game-status"><p data-status>Choose a move.</p></div><div class="rps">${choices.map((choice) => `<button type="button" data-choice="${choice.name}"><span>${choice.mark}</span><strong>${choice.name}</strong></button>`).join("")}</div>${restartButton()}`);
    root().addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice]");
      if (!button) return;
      const player = button.dataset.choice;
      const computer = choices[Math.floor(Math.random() * choices.length)].name;
      const win = (player === "Rock" && computer === "Scissors") || (player === "Paper" && computer === "Rock") || (player === "Scissors" && computer === "Paper");
      status(player === computer ? `Both picked ${player}. Tie!` : win ? `${player} beats ${computer}. You win!` : `${computer} beats ${player}. Try again!`);
    });
    document.querySelector("[data-restart]").addEventListener("click", renderRps);
  }

  function renderMemory() {
    const themes = {
      nature: {
        name: "Nature",
        cards: ["🌲", "🌸", "🌙", "⭐", "🍄", "🦋", "🌊", "☀️"]
      },
      snacks: {
        name: "Snacks",
        cards: ["🍕", "🍩", "🍓", "🍪", "🍔", "🍦", "🥨", "🍉"]
      },
      space: {
        name: "Space",
        cards: ["🚀", "🪐", "🌎", "☄️", "👽", "🛰️", "🌌", "🔭"]
      }
    };
    let currentTheme = "nature";
    let cards = [];
    let open = [];
    let matched = 0;
    let moves = 0;

    const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
    const newRound = () => {
      cards = shuffle([...themes[currentTheme].cards, ...themes[currentTheme].cards]);
      open = [];
      matched = 0;
      moves = 0;
      draw();
    };
    const draw = () => {
      set(`
        <div class="game-status">
          <p data-status>${themes[currentTheme].name}: find all 8 pairs. Moves: ${moves}</p>
          <div class="theme-tabs" aria-label="Memory Match themes">
            ${Object.entries(themes).map(([id, theme]) => `<button type="button" data-theme="${id}" class="${id === currentTheme ? "active" : ""}">${theme.name}</button>`).join("")}
          </div>
        </div>
        <div class="memory-grid">${cards.map((_, i) => `<button class="memory-card" data-card="${i}" aria-label="Hidden card"><span class="card-back">?</span></button>`).join("")}</div>
        ${restartButton()}
      `);
      document.querySelectorAll("[data-theme]").forEach((button) => {
        button.addEventListener("click", () => {
          currentTheme = button.dataset.theme;
          newRound();
        });
      });
      root().addEventListener("click", onCardClick);
      document.querySelector("[data-restart]").addEventListener("click", newRound);
    };

    function onCardClick(event) {
      const button = event.target.closest("[data-card]");
      if (!button || button.classList.contains("matched") || open.includes(button) || open.length === 2) return;
      button.classList.add("flipped");
      button.innerHTML = `<span class="card-face">${cards[Number(button.dataset.card)]}</span>`;
      open.push(button);
      if (open.length === 2) {
        moves += 1;
        const [a, b] = open;
        if (a.textContent === b.textContent) {
          a.classList.add("matched");
          b.classList.add("matched");
          matched += 1;
          open = [];
          status(matched === themes[currentTheme].cards.length ? `You matched every ${themes[currentTheme].name.toLowerCase()} pair in ${moves} moves!` : `${themes[currentTheme].name}: ${matched} pairs matched. Moves: ${moves}`);
        } else {
          setTimeout(() => {
            a.classList.remove("flipped");
            b.classList.remove("flipped");
            a.innerHTML = `<span class="card-back">?</span>`;
            b.innerHTML = `<span class="card-back">?</span>`;
            open = [];
            status(`${themes[currentTheme].name}: find all 8 pairs. Moves: ${moves}`);
          }, 750);
        }
      }
    }

    newRound();
  }

  function renderSnake() {
    set(`<div class="game-status"><p data-status>Use arrow keys or WASD. Score: 0</p></div><div class="snake-wrap"><canvas width="420" height="420"></canvas></div>${restartButton()}`);
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const size = 21;
    const cell = canvas.width / size;
    let snake = [{ x: 10, y: 10 }];
    let dir = { x: 1, y: 0 };
    let next = dir;
    let food = { x: 15, y: 10 };
    let score = 0;
    let alive = true;
    const placeFood = () => {
      do {
        food = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
      } while (snake.some((part) => part.x === food.x && part.y === food.y));
    };
    const paint = () => {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#172033");
      gradient.addColorStop(1, "#243a5e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255,255,255,0.055)";
      ctx.lineWidth = 1;
      for (let i = 1; i < size; i++) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
      }
      ctx.fillStyle = "#ff8ea6";
      ctx.shadowColor = "rgba(255, 142, 166, 0.65)";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      snake.forEach((part, index) => {
        const inset = index === 0 ? 1 : 3;
        ctx.fillStyle = index === 0 ? "#9fe3d4" : "#64c4a3";
        ctx.beginPath();
        ctx.roundRect(part.x * cell + inset, part.y * cell + inset, cell - inset * 2, cell - inset * 2, 7);
        ctx.fill();
      });
      const head = snake[0];
      ctx.fillStyle = "#172033";
      ctx.beginPath();
      ctx.arc(head.x * cell + cell * 0.36, head.y * cell + cell * 0.36, 2.4, 0, Math.PI * 2);
      ctx.arc(head.x * cell + cell * 0.64, head.y * cell + cell * 0.36, 2.4, 0, Math.PI * 2);
      ctx.fill();
    };
    const tick = () => {
      if (!alive) return;
      dir = next;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size || snake.some((part) => part.x === head.x && part.y === head.y)) {
        alive = false;
        status(`Game over. Final score: ${score}`);
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 1;
        status(`Use arrow keys or WASD. Score: ${score}`);
        placeFood();
      } else {
        snake.pop();
      }
      paint();
    };
    window.onkeydown = (event) => {
      const map = { ArrowUp: [0,-1], w: [0,-1], ArrowDown: [0,1], s: [0,1], ArrowLeft: [-1,0], a: [-1,0], ArrowRight: [1,0], d: [1,0] };
      if (!map[event.key]) return;
      const [x, y] = map[event.key];
      if (x + dir.x || y + dir.y) next = { x, y };
    };
    paint();
    const timer = setInterval(tick, 130);
    document.querySelector("[data-restart]").addEventListener("click", () => {
      clearInterval(timer);
      renderSnake();
    });
  }

  function render2048() {
    let board = Array(16).fill(0);
    const add = () => {
      const empty = board.map((v, i) => v ? null : i).filter((v) => v !== null);
      if (empty.length) board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
    };
    const draw = () => {
      document.querySelector(".puzzle-grid").innerHTML = board.map((value) => `<div class="puzzle-tile">${value || ""}</div>`).join("");
      status(`Score: ${board.reduce((a, b) => a + b, 0)}`);
    };
    const merge = (line) => {
      const nums = line.filter(Boolean);
      for (let i = 0; i < nums.length - 1; i++) {
        if (nums[i] === nums[i + 1]) {
          nums[i] *= 2;
          nums.splice(i + 1, 1);
        }
      }
      return [...nums, ...Array(4 - nums.length).fill(0)];
    };
    const move = (dir) => {
      const old = board.join(",");
      const nextBoard = Array(16).fill(0);
      for (let i = 0; i < 4; i++) {
        let line = dir === "left" || dir === "right" ? [0,1,2,3].map((c) => board[i * 4 + c]) : [0,1,2,3].map((r) => board[r * 4 + i]);
        if (dir === "right" || dir === "down") line.reverse();
        line = merge(line);
        if (dir === "right" || dir === "down") line.reverse();
        line.forEach((value, n) => {
          if (dir === "left" || dir === "right") nextBoard[i * 4 + n] = value;
          else nextBoard[n * 4 + i] = value;
        });
      }
      board = nextBoard;
      if (board.join(",") !== old) add();
      draw();
    };
    set(`<div class="game-status"><p data-status>Use arrow keys or WASD.</p></div><div class="puzzle-grid"></div>${restartButton()}`);
    add(); add(); draw();
    window.onkeydown = (event) => {
      const map = { ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right", ArrowUp: "up", w: "up", ArrowDown: "down", s: "down" };
      if (map[event.key]) move(map[event.key]);
    };
    document.querySelector("[data-restart]").addEventListener("click", render2048);
  }

  function renderHangman() {
    const words = ["planet", "library", "science", "friend", "pencil", "teacher", "garden", "music", "history", "kindness"];
    const word = words[Math.floor(Math.random() * words.length)];
    let guessed = new Set();
    let misses = 0;
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    set(`<div class="game-status"><p data-status>Guess the word. Misses: 0 of 6</p></div><div class="word"></div><div class="keyboard">${letters.map((letter) => `<button type="button" data-letter="${letter}">${letter.toUpperCase()}</button>`).join("")}</div>${restartButton()}`);
    const draw = () => {
      document.querySelector(".word").innerHTML = word.split("").map((letter) => `<span>${guessed.has(letter) ? letter.toUpperCase() : ""}</span>`).join("");
      const won = word.split("").every((letter) => guessed.has(letter));
      if (won) status(`You got it: ${word.toUpperCase()}!`);
      else if (misses >= 6) status(`Out of guesses. The word was ${word.toUpperCase()}.`);
      else status(`Guess the word. Misses: ${misses} of 6`);
    };
    root().addEventListener("click", (event) => {
      const button = event.target.closest("[data-letter]");
      if (!button || misses >= 6 || word.split("").every((letter) => guessed.has(letter))) return;
      const letter = button.dataset.letter;
      button.disabled = true;
      guessed.add(letter);
      if (!word.includes(letter)) misses += 1;
      draw();
    });
    draw();
    document.querySelector("[data-restart]").addEventListener("click", renderHangman);
  }

  function renderQuiz() {
    const questions = [
      { q: "How many sides does a triangle have?", a: "3", options: ["3", "4", "5"] },
      { q: "Which planet is known as the Red Planet?", a: "Mars", options: ["Mars", "Venus", "Jupiter"] },
      { q: "What do bees make?", a: "Honey", options: ["Honey", "Bread", "Paper"] },
      { q: "Which ocean is the largest?", a: "Pacific", options: ["Atlantic", "Pacific", "Indian"] }
    ];
    let index = 0;
    let score = 0;
    const draw = () => {
      if (index >= questions.length) {
        set(`<div class="game-status"><p data-status>Final score: ${score} of ${questions.length}</p></div>${restartButton()}`);
        document.querySelector("[data-restart]").addEventListener("click", renderQuiz);
        return;
      }
      const item = questions[index];
      set(`<div class="game-status"><p data-status>Question ${index + 1} of ${questions.length}. Score: ${score}</p></div><h2>${item.q}</h2><div class="quiz-options">${item.options.map((option) => `<button class="quiz-option" data-answer="${option}">${option}</button>`).join("")}</div>${restartButton()}`);
      root().addEventListener("click", onAnswer);
      document.querySelector("[data-restart]").addEventListener("click", renderQuiz);
    };

    function onAnswer(event) {
      const button = event.target.closest("[data-answer]");
      if (!button) return;
      if (button.dataset.answer === questions[index].a) score += 1;
      index += 1;
      draw();
    }

    draw();
  }

  function renderEggyHillDrive() {
    set(`<div class="game-status"><p data-status>Keep the egg balanced. Distance: 0</p></div><div class="snake-wrap"><canvas class="wide-canvas" width="720" height="420"></canvas></div><div class="drive-help"><button type="button" data-drive="left">Brake</button><button type="button" data-drive="right">Gas</button></div>${restartButton()}`);
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const keys = { left: false, right: false };
    let x = 240;
    let speed = 0;
    let eggOffset = 0;
    let eggVelocity = 0;
    let eggY = -58;
    let falling = false;
    let alive = true;
    const carrierLimit = 46;

    const groundY = (worldX) => 300 + Math.sin(worldX * 0.012) * 42 + Math.sin(worldX * 0.027) * 16;
    const slopeAt = (worldX) => (groundY(worldX + 4) - groundY(worldX - 4)) / 8;
    const setKey = (key, value) => {
      if (key === "ArrowLeft" || key === "a") keys.left = value;
      if (key === "ArrowRight" || key === "d") keys.right = value;
    };
    const keydown = (event) => setKey(event.key, true);
    const keyup = (event) => setKey(event.key, false);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    document.querySelectorAll("[data-drive]").forEach((button) => {
      const side = button.dataset.drive;
      button.addEventListener("pointerdown", () => { keys[side] = true; });
      button.addEventListener("pointerup", () => { keys[side] = false; });
      button.addEventListener("pointerleave", () => { keys[side] = false; });
    });

    const draw = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
      sky.addColorStop(0, "#cfe8fb");
      sky.addColorStop(0.6, "#f7d2dc");
      sky.addColorStop(1, "#e8f4ed");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 5; i++) {
        const cloudX = (i * 170 - (x * 0.22) % 170) - 60;
        ctx.beginPath();
        ctx.ellipse(cloudX, 72 + (i % 2) * 34, 46, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(cloudX + 32, 68 + (i % 2) * 34, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#7cc76f";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (let screenX = 0; screenX <= canvas.width; screenX += 8) {
        ctx.lineTo(screenX, groundY(x + screenX - 150));
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      const carX = 150;
      const carY = groundY(x) - 25;
      const angle = Math.atan(slopeAt(x));
      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(20, 33, 48, 0.2)";
      ctx.beginPath(); ctx.ellipse(0, 24, 72, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ef6b88";
      ctx.beginPath(); ctx.roundRect(-54, -22, 108, 34, 10); ctx.fill();
      ctx.fillStyle = "#243a5e";
      ctx.beginPath(); ctx.roundRect(-26, -44, 52, 30, 8); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      ctx.beginPath(); ctx.roundRect(-16, -38, 32, 13, 5); ctx.fill();
      ctx.strokeStyle = "rgba(36, 58, 94, 0.62)";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-54, -46);
      ctx.lineTo(-48, -82);
      ctx.moveTo(54, -46);
      ctx.lineTo(48, -82);
      ctx.moveTo(-48, -82);
      ctx.quadraticCurveTo(0, -92, 48, -82);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.74)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-44, -51);
      ctx.quadraticCurveTo(0, -40, 44, -51);
      ctx.stroke();
      ctx.fillStyle = "#1f2933";
      ctx.beginPath(); ctx.arc(-34, 13, 13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(34, 13, 13, 0, Math.PI * 2); ctx.fill();
      ctx.translate(eggOffset, eggY);
      ctx.rotate(eggOffset * 0.018);
      ctx.fillStyle = "#fff8dc";
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 23, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#d9bf77"; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(angle);
      ctx.strokeStyle = "#243a5e";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-48, -50);
      ctx.quadraticCurveTo(0, -34, 48, -50);
      ctx.stroke();
      ctx.restore();
    };

    const tick = () => {
      if (!alive) return;
      speed += keys.right ? 0.06 : 0;
      speed -= keys.left ? 0.08 : 0;
      speed -= slopeAt(x) * 0.09;
      speed *= 0.985;
      speed = Math.max(-2.5, Math.min(5.5, speed));
      x += speed;
      const carAngle = Math.atan(slopeAt(x));
      if (!falling) {
        eggVelocity += carAngle * 0.055 + speed * 0.0015;
        eggVelocity *= 0.93;
        eggOffset += eggVelocity;
        if (Math.abs(eggOffset) > carrierLimit) {
          falling = true;
          eggVelocity = Math.sign(eggOffset) * Math.max(1.2, Math.abs(eggVelocity));
        }
      } else {
        eggOffset += eggVelocity;
        eggY += 4.2;
        eggVelocity *= 0.98;
      }
      if (falling && eggY > 32) {
        alive = false;
        status(`Egg dropped! Distance: ${Math.max(0, Math.floor(x - 240))}`);
      } else {
        status(`${falling ? "Egg is falling!" : "Keep the egg in the carrier."} Distance: ${Math.max(0, Math.floor(x - 240))}`);
      }
      draw();
    };
    const timer = setInterval(tick, 1000 / 60);
    draw();
    document.querySelector("[data-restart]").addEventListener("click", () => {
      clearInterval(timer);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      renderEggyHillDrive();
    });
  }

  function renderTrafficRacer() {
    set(`<div class="game-status"><p data-status>Steer with left/right or A/D. Distance: 0m</p></div><div class="snake-wrap"><canvas class="tall-canvas" width="420" height="620"></canvas></div><div class="drive-help"><button type="button" data-lane="-1">Steer Left</button><button type="button" data-lane="1">Steer Right</button></div>${restartButton()}`);
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const keys = { left: false, right: false };
    const laneChoices = [-0.86, -0.28, 0.28, 0.86];
    const traffic = [
      { lane: -0.86, z: 1.9, color: "#f5d1a8", passed: false },
      { lane: 0.86, z: 2.85, color: "#9bc8e6", passed: false },
      { lane: 0.86, z: 4.25, color: "#c7b4df", passed: false }
    ];
    let playerX = 0;
    let velocityX = 0;
    let speed = 0.011;
    let distanceMeters = 0;
    let nearMisses = 0;
    let roadOffset = 0;
    let shake = 0;
    let alive = true;
    let frameId;

    const laneX = (lane, depth) => canvas.width / 2 + lane * (58 + 118 * depth);
    const roadWidth = (depth) => 88 + 270 * depth;
    const roadY = (depth) => 170 + depth * depth * 430;
    const perspective = (z) => Math.max(0.05, Math.min(1, 1 / z));
    const respawnCar = (car) => {
      const farthest = Math.max(...traffic.filter((other) => other !== car).map((other) => other.z));
      const blocked = traffic
        .filter((other) => other !== car && other.z > farthest - 0.85)
        .map((other) => other.lane);
      const earlyDistance = distanceMeters < 550;
      const openLanes = laneChoices.filter((lane) => !blocked.includes(lane) && (!earlyDistance || Math.abs(lane) > 0.7));
      car.z = farthest + 0.95 + Math.random() * 0.7;
      car.lane = (openLanes.length ? openLanes : laneChoices)[Math.floor(Math.random() * (openLanes.length || laneChoices.length))];
      car.color = ["#f5d1a8", "#9bc8e6", "#c7b4df", "#9fcdbd", "#91d4d6"][Math.floor(Math.random() * 5)];
      car.passed = false;
      car.nearMissed = false;
    };
    const carOnScreen = (car) => {
      const depth = perspective(car.z);
      return {
        x: laneX(car.lane, depth),
        y: roadY(depth),
        w: 32 + 34 * depth,
        h: 58 + 46 * depth,
        depth
      };
    };
    const moveLane = (delta, pressed) => {
      keys[delta < 0 ? "left" : "right"] = pressed;
    };
    const keydown = (event) => {
      if (event.key === "ArrowLeft" || event.key === "a") keys.left = true;
      if (event.key === "ArrowRight" || event.key === "d") keys.right = true;
    };
    const keyup = (event) => {
      if (event.key === "ArrowLeft" || event.key === "a") keys.left = false;
      if (event.key === "ArrowRight" || event.key === "d") keys.right = false;
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    document.querySelectorAll("[data-lane]").forEach((button) => {
      const delta = Number(button.dataset.lane);
      button.addEventListener("pointerdown", () => moveLane(delta, true));
      button.addEventListener("pointerup", () => moveLane(delta, false));
      button.addEventListener("pointerleave", () => moveLane(delta, false));
    });

    const drawCar = (x, y, w, h, color, tilt = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.shadowColor = "rgba(11, 22, 36, 0.28)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "rgba(5, 12, 24, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, h * 0.38, w * 0.55, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, Math.max(8, w * 0.18));
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.beginPath();
      ctx.roundRect(-w * 0.28, -h * 0.32, w * 0.56, h * 0.2, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(26, 42, 61, 0.28)";
      ctx.beginPath();
      ctx.roundRect(-w * 0.31, h * 0.08, w * 0.62, h * 0.22, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(-w * 0.36, -h * 0.45, w * 0.18, h * 0.08);
      ctx.fillRect(w * 0.18, -h * 0.45, w * 0.18, h * 0.08);
      ctx.fillStyle = "rgba(38, 52, 73, 0.55)";
      ctx.fillRect(-w * 0.48, -h * 0.22, w * 0.12, h * 0.28);
      ctx.fillRect(w * 0.36, -h * 0.22, w * 0.12, h * 0.28);
      ctx.restore();
    };

    const drawRoad = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#b8d9f1");
      gradient.addColorStop(0.45, "#d9e8f4");
      gradient.addColorStop(1, "#8aa5ba");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(246, 205, 217, 0.5)";
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(128, 162);
      ctx.lineTo(canvas.width - 128, 162);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#344252";
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - roadWidth(1) / 2, canvas.height);
      ctx.lineTo(canvas.width / 2 - roadWidth(0) / 2, 170);
      ctx.lineTo(canvas.width / 2 + roadWidth(0) / 2, 170);
      ctx.lineTo(canvas.width / 2 + roadWidth(1) / 2, canvas.height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.82)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - roadWidth(1) / 2, canvas.height);
      ctx.lineTo(canvas.width / 2 - roadWidth(0) / 2, 170);
      ctx.moveTo(canvas.width / 2 + roadWidth(1) / 2, canvas.height);
      ctx.lineTo(canvas.width / 2 + roadWidth(0) / 2, 170);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 18; i++) {
        const depth = ((i * 0.08 + roadOffset) % 1);
        const y1 = roadY(depth);
        const y2 = roadY(Math.min(1, depth + 0.035));
        const width1 = roadWidth(depth);
        const width2 = roadWidth(Math.min(1, depth + 0.035));
        [-0.33, 0.33].forEach((laneMark) => {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 + laneMark * width1, y1);
          ctx.lineTo(canvas.width / 2 + laneMark * width2, y2);
          ctx.stroke();
        });
      }
    };

    const draw = () => {
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.86;
      }
      drawRoad();
      traffic
        .map((car) => ({ car, screen: carOnScreen(car) }))
        .sort((a, b) => a.screen.depth - b.screen.depth)
        .forEach(({ car, screen }) => drawCar(screen.x, screen.y, screen.w, screen.h, car.color));
      drawCar(canvas.width / 2 + playerX * 122, 535, 66, 112, "#ef6b88", velocityX * 0.045);
      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      ctx.font = "800 16px system-ui";
      ctx.fillText(`${Math.floor(distanceMeters)}m`, 18, 34);
      ctx.fillText(`${Math.floor(speed * 5200)} km/h`, 18, 58);
      if (nearMisses) ctx.fillText(`Near misses: ${nearMisses}`, 18, 82);
      ctx.restore();
    };

    const tick = () => {
      if (!alive) return;
      velocityX += (keys.right ? 0.018 : 0) - (keys.left ? 0.018 : 0);
      velocityX *= 0.9;
      playerX = Math.max(-1.18, Math.min(1.18, playerX + velocityX));
      speed = Math.min(0.026, speed + 0.000006);
      roadOffset = (roadOffset + speed * 1.4) % 1;
      distanceMeters += speed * 52;
      traffic.forEach((other, index) => {
        other.z -= speed * (1.05 + index * 0.02);
        if (other.z < 0.52) {
          if (!other.passed) {
            distanceMeters += 18;
            other.passed = true;
          }
          respawnCar(other);
        }
        const screen = carOnScreen(other);
        const playerScreenX = canvas.width / 2 + playerX * 122;
        const closeX = Math.abs(playerScreenX - screen.x);
        const closeY = Math.abs(535 - screen.y);
        if (closeY < 58 && closeX < (screen.w + 30) / 2) {
          alive = false;
          shake = 18;
          status(`Crash! Distance: ${Math.floor(distanceMeters)}m. Near misses: ${nearMisses}`);
        } else if (!other.nearMissed && closeY < 92 && closeX < (screen.w + 92) / 2) {
          nearMisses += 1;
          other.nearMissed = true;
          shake = 4;
        }
        if (closeY > 140) {
          other.nearMissed = false;
        }
      });
      if (alive) status(`Steer with left/right or A/D. Distance: ${Math.floor(distanceMeters)}m. Speed: ${Math.floor(speed * 5200)} km/h`);
      draw();
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    document.querySelector("[data-restart]").addEventListener("click", () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      renderTrafficRacer();
    });
  }

  function renderSpaceCrewBots() {
    set(`
      <div class="game-status">
        <p data-status>You are the impostor. Walk with WASD or arrow keys.</p>
        <p class="crew-meter" data-crew-meter>Tasks: 0%</p>
      </div>
      <div class="crew-live-layout">
        <div>
          <canvas class="ship-canvas" width="900" height="560"></canvas>
          <div class="crew-action-bar">
            <button type="button" data-move="up">Up</button>
            <button type="button" data-move="left">Left</button>
            <button type="button" data-move="down">Down</button>
            <button type="button" data-move="right">Right</button>
            <button type="button" class="danger-button" data-kill>Kill</button>
            <button type="button" data-report>Report</button>
            <button type="button" data-sabotage>Sabotage</button>
            <button type="button" data-meeting>Meeting</button>
          </div>
        </div>
        <aside class="crew-panel">
          <div class="crew-card"><strong>How to Win</strong><p>Eliminate crewmates until only one bot is left. Avoid getting voted out.</p></div>
          <div class="crew-card"><strong>Ship Log</strong><div class="crew-log" data-crew-log></div></div>
        </aside>
      </div>
      ${restartButton()}
    `);

    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const logBox = document.querySelector("[data-crew-log]");
    const meter = document.querySelector("[data-crew-meter]");
    const keys = { up: false, down: false, left: false, right: false };
    const colors = ["#f3a6b6", "#9bc8e6", "#9fcdbd", "#f5d1a8", "#c7b4df", "#91d4d6"];
    const rooms = [
      { name: "Cafeteria", x: 60, y: 60, w: 230, h: 150 },
      { name: "Weapons", x: 330, y: 50, w: 220, h: 130 },
      { name: "Navigation", x: 620, y: 70, w: 210, h: 145 },
      { name: "Med Bay", x: 70, y: 330, w: 220, h: 150 },
      { name: "Electrical", x: 345, y: 350, w: 210, h: 150 },
      { name: "Engine", x: 635, y: 335, w: 205, h: 145 }
    ];
    const halls = [
      { x: 260, y: 130, w: 410, h: 56 },
      { x: 420, y: 155, w: 58, h: 240 },
      { x: 230, y: 395, w: 470, h: 58 },
      { x: 140, y: 190, w: 58, h: 185 },
      { x: 735, y: 195, w: 58, h: 175 }
    ];
    const playAreas = [...rooms, ...halls];
    const player = { name: "You", x: 420, y: 425, r: 16, color: "#ef6b88", alive: true };
    const bots = ["Milo", "Ari", "Nova", "Sam", "Jules"].map((name, index) => {
      const room = rooms[index % rooms.length];
      return {
        name,
        x: room.x + room.w / 2,
        y: room.y + room.h / 2,
        r: 15,
        color: colors[index + 1],
        alive: true,
        body: false,
        target: { x: room.x + 40 + Math.random() * (room.w - 80), y: room.y + 35 + Math.random() * (room.h - 70) },
        suspicion: 0
      };
    });
    let logs = ["You are the impostor. Stay close to a bot, then press Kill."];
    let killCooldown = 0;
    let taskProgress = 0;
    let sabotageTimer = 0;
    let meetingOpen = false;
    let over = false;

    const addLog = (message) => {
      logs.unshift(message);
      logs = logs.slice(0, 9);
      logBox.innerHTML = logs.map((item) => `<p>${item}</p>`).join("");
    };
    const inside = (x, y, area) => x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
    const walkable = (x, y) => playAreas.some((area) => inside(x, y, area));
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const nearestAliveBot = () => bots.filter((bot) => bot.alive).sort((a, b) => distance(player, a) - distance(player, b))[0];
    const nearestBody = () => bots.filter((bot) => bot.body).sort((a, b) => distance(player, a) - distance(player, b))[0];
    const randomPoint = () => {
      const area = playAreas[Math.floor(Math.random() * playAreas.length)];
      return { x: area.x + 25 + Math.random() * (area.w - 50), y: area.y + 25 + Math.random() * (area.h - 50) };
    };
    const updateButtons = () => {
      const killTarget = nearestAliveBot();
      const bodyTarget = nearestBody();
      document.querySelector("[data-kill]").disabled = over || meetingOpen || killCooldown > 0 || !killTarget || distance(player, killTarget) > 54;
      document.querySelector("[data-report]").disabled = over || meetingOpen || !bodyTarget || distance(player, bodyTarget) > 62;
      document.querySelector("[data-sabotage]").disabled = over || meetingOpen || sabotageTimer > 0;
      document.querySelector("[data-meeting]").disabled = over || meetingOpen;
    };
    const endGame = (message) => {
      over = true;
      status(message);
      addLog(message);
      updateButtons();
    };
    const checkWin = () => {
      const aliveBots = bots.filter((bot) => bot.alive).length;
      if (aliveBots <= 1) endGame("Impostor wins. The ship is yours.");
      if (taskProgress >= 100) endGame("Crew wins. They finished all tasks.");
    };
    const kill = () => {
      const target = nearestAliveBot();
      if (!target || distance(player, target) > 54 || killCooldown > 0 || over || meetingOpen) return;
      target.alive = false;
      target.body = true;
      target.suspicion += 2;
      killCooldown = 9;
      bots.filter((bot) => bot.alive && distance(bot, target) < 150).forEach((bot) => { bot.suspicion += 2; });
      addLog(`${target.name} was killed.`);
      checkWin();
    };
    const startMeeting = (reason) => {
      if (over || meetingOpen) return;
      meetingOpen = true;
      const living = bots.filter((bot) => bot.alive);
      const suspicion = living.reduce((sum, bot) => sum + bot.suspicion, 0);
      const chanceToCatchYou = Math.min(0.78, 0.16 + suspicion * 0.08 + bots.filter((bot) => bot.body).length * 0.1);
      const caught = Math.random() < chanceToCatchYou;
      addLog(`${reason} Meeting called. Bots are voting...`);
      setTimeout(() => {
        if (caught) {
          endGame("You were voted out. Crew wins.");
          return;
        }
        const ejected = living.sort((a, b) => b.suspicion - a.suspicion)[0] || living[0];
        if (ejected) {
          ejected.alive = false;
          ejected.body = false;
          addLog(`${ejected.name} was ejected. They were not the impostor.`);
        } else {
          addLog("No one was ejected.");
        }
        bots.forEach((bot) => { bot.body = false; bot.suspicion = Math.max(0, bot.suspicion - 1); });
        meetingOpen = false;
        killCooldown = Math.max(killCooldown, 4);
        checkWin();
      }, 1200);
    };
    const report = () => {
      const body = nearestBody();
      if (!body || distance(player, body) > 62) return;
      startMeeting(`Body reported: ${body.name}.`);
    };
    const sabotage = () => {
      if (sabotageTimer > 0 || over || meetingOpen) return;
      sabotageTimer = 18;
      taskProgress = Math.max(0, taskProgress - 10);
      bots.forEach((bot) => { bot.target = randomPoint(); });
      addLog("Sabotage triggered. Bots are distracted.");
    };
    const drawCrewmate = (person, label, isBody = false) => {
      ctx.save();
      ctx.translate(person.x, person.y);
      if (isBody) ctx.rotate(-0.45);
      ctx.fillStyle = person.color;
      ctx.beginPath();
      ctx.roundRect(-person.r, -person.r, person.r * 2, person.r * 2.35, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(215, 241, 255, 0.92)";
      ctx.beginPath();
      ctx.roundRect(-6, -10, 18, 11, 5);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#1b2738";
      ctx.font = "700 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, person.x, person.y + 36);
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#dbeafa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      halls.forEach((hall) => {
        ctx.fillStyle = "rgba(137, 177, 210, 0.62)";
        ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
      });
      rooms.forEach((room) => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
        ctx.strokeStyle = "rgba(36, 58, 94, 0.22)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.w, room.h, 18);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(27, 39, 56, 0.72)";
        ctx.font = "800 16px system-ui";
        ctx.textAlign = "left";
        ctx.fillText(room.name, room.x + 16, room.y + 28);
      });
      bots.filter((bot) => bot.body).forEach((bot) => drawCrewmate(bot, `${bot.name} body`, true));
      bots.filter((bot) => bot.alive).forEach((bot) => drawCrewmate(bot, bot.name));
      drawCrewmate(player, "You");
      const target = nearestAliveBot();
      if (target && distance(player, target) <= 54 && killCooldown <= 0 && !meetingOpen) {
        ctx.strokeStyle = "rgba(239, 107, 136, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    const movePlayer = () => {
      let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (dx && dy) { dx *= 0.72; dy *= 0.72; }
      const nextX = player.x + dx * 3.7;
      const nextY = player.y + dy * 3.7;
      if (walkable(nextX, player.y)) player.x = nextX;
      if (walkable(player.x, nextY)) player.y = nextY;
    };
    const moveBots = () => {
      bots.filter((bot) => bot.alive).forEach((bot) => {
        if (distance(bot, bot.target) < 12 || Math.random() < 0.006) bot.target = randomPoint();
        const dx = bot.target.x - bot.x;
        const dy = bot.target.y - bot.y;
        const length = Math.hypot(dx, dy) || 1;
        const nextX = bot.x + (dx / length) * 1.45;
        const nextY = bot.y + (dy / length) * 1.45;
        if (walkable(nextX, bot.y)) bot.x = nextX;
        if (walkable(bot.x, nextY)) bot.y = nextY;
        if (bots.some((body) => body.body && distance(bot, body) < 50) && Math.random() < 0.006) {
          startMeeting(`${bot.name} found a body.`);
        }
      });
    };
    const tick = () => {
      if (!over && !meetingOpen) {
        movePlayer();
        moveBots();
        taskProgress += sabotageTimer > 0 ? 0.006 : 0.018;
        killCooldown = Math.max(0, killCooldown - 1 / 60);
        sabotageTimer = Math.max(0, sabotageTimer - 1 / 60);
        checkWin();
      }
      meter.textContent = `Tasks: ${Math.min(100, Math.floor(taskProgress))}%`;
      const cooldownText = killCooldown > 0 ? ` Kill cooldown: ${Math.ceil(killCooldown)}s.` : "";
      const sabotageText = sabotageTimer > 0 ? ` Sabotage: ${Math.ceil(sabotageTimer)}s.` : "";
      if (!over) status(meetingOpen ? "Meeting in progress..." : `You are the impostor.${cooldownText}${sabotageText}`);
      updateButtons();
      draw();
    };

    const keydown = (event) => {
      const map = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
      if (map[event.key]) keys[map[event.key]] = true;
      if (event.key === " " || event.key === "k") kill();
      if (event.key === "r") report();
    };
    const keyup = (event) => {
      const map = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
      if (map[event.key]) keys[map[event.key]] = false;
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    document.querySelectorAll("[data-move]").forEach((button) => {
      const direction = button.dataset.move;
      button.addEventListener("pointerdown", () => { keys[direction] = true; });
      button.addEventListener("pointerup", () => { keys[direction] = false; });
      button.addEventListener("pointerleave", () => { keys[direction] = false; });
    });
    document.querySelector("[data-kill]").addEventListener("click", kill);
    document.querySelector("[data-report]").addEventListener("click", report);
    document.querySelector("[data-sabotage]").addEventListener("click", sabotage);
    document.querySelector("[data-meeting]").addEventListener("click", () => startMeeting("Emergency"));
    const timer = setInterval(tick, 1000 / 60);
    addLog("Tip: K or Space kills, R reports. Use meetings carefully.");
    document.querySelector("[data-restart]").addEventListener("click", () => {
      clearInterval(timer);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      renderSpaceCrewBots();
    });
  }

  const renderers = {
    "tic-tac-toe": renderTicTacToe,
    "connect-four": renderConnectFour,
    "rock-paper-scissors": renderRps,
    "memory-match": renderMemory,
    snake: renderSnake,
    "twenty-forty-eight": render2048,
    hangman: renderHangman,
    quiz: renderQuiz,
    "eggy-hill-drive": renderEggyHillDrive,
    "space-crew-bots": renderSpaceCrewBots,
    "traffic-racer": renderTrafficRacer
  };

  return {
    render(gameId) {
      window.onkeydown = null;
      renderers[gameId]();
    }
  };
})();
