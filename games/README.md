# Friend Games Hub

A simple responsive browser games hub with password protection.

## Run

Set the shared password in an environment variable before starting the server:

```sh
FRIEND_GAMES_PASSWORD="choose-a-password" npm start
```

Then open `http://127.0.0.1:3000`.

## Optional AI Bots

Space Crew Bots works with local fallback logic by default. To let it use OpenAI for bot movement goals, meeting discussion, voting, and short bot dialogue, start the server with an API key:

```sh
OPENAI_API_KEY="your-api-key" FRIEND_GAMES_PASSWORD="choose-a-password" npm start
```

You can also set `OPENAI_MODEL` if you want to use a different compatible model.

## Deploy on Netlify

This repo includes root-level `netlify.toml` and `netlify/functions/site.js`, so Netlify can serve the site with the same password protection and API routes.

Use these Netlify settings:

```txt
Base directory: leave blank
Build command: npm run build
Publish directory: games/public
Functions directory: netlify/functions
```

Add these environment variables in Netlify Site Settings:

```txt
FRIEND_GAMES_PASSWORD=choose-a-password
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optional, but Space Crew Bots uses it for smarter bot movement and meetings when it is present.

## Deploy on Vercel

Vercel can still run this project with `vercel.json` and `api/index.js`, but Netlify is the recommended setup for this app.

## Change the Password

Change the value of `FRIEND_GAMES_PASSWORD` when you start the server. The password is checked in `server.js` and is not hardcoded in the browser files.

## Game catalog

The home page loads tiles from **`GET /api/games`** (after login). The handler scans **`public/games`** for every **`.html`** file except `index.html`, builds a title from the filename (hyphens and underscores become spaces, words are capitalized), assigns a rotating accent color, and returns JSON consumed by **`public/assets/main.js`**.

- **Local server:** `games/server.js` uses `games/lib/games-catalog.js` (`fs.readdirSync`).
- **Netlify:** `netlify/functions/site.js` uses the same helper against the publish root.
- **Vercel:** `games/api/index.js` does the same.

If **`/api/games`** is missing (for example purely static hosting), the page falls back to **`public/games/index.json`**. Keep that file in sync by running the root **`npm run build`** (which runs `games/scripts/generate-games-index.js`) or, from the repo root:

```sh
node games/scripts/generate-games-index.js
```

Optional: set **`FRIEND_GAMES_FOLDER`** to a folder name under `public` (default `games`) if your HTML games live in a different subdirectory.

## Add a game

1. Add a page such as **`public/games/your-game-name.html`**. It appears on the home catalog automatically; the tile title comes from the filename.
2. If the game uses the shared in-page runner, add a renderer and register it in **`public/assets/games.js`**, and call **`FriendGames.render("game-id")`** from your HTML with a map key that matches the registry (see **`public/games/snake.html`** and similar files). The catalog link only opens the HTML file; the **`game-id`** in the script tag must still match **`games.js`**.
3. Optional catalog tweaks: **`thumbnail`** on each game object is supported by the card template if you add it (for example in a hand-maintained **`index.json`** entry).
4. After adding or removing HTML games, run **`npm run build`** (or the script above) if you rely on **`index.json`** for static fallback.
