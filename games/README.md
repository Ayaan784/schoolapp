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

## Add a Game

The comments in `public/assets/games-data.js` show the main steps:

1. Add a catalog object to `window.FRIEND_GAMES`.
2. Create a matching page in `public/games`.
3. Add a renderer function and map entry in `public/assets/games.js`.
