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

## Deploy on Vercel

This project includes `vercel.json` and `api/index.js` so it can run on Vercel without a long-running server.

If this app is inside a larger repository, set the Vercel root directory to:

```txt
games
```

Use these Vercel settings:

```txt
Framework Preset: Other
Build Command: npm install
Output Directory: leave blank
Install Command: npm install
```

Add these environment variables in Vercel Project Settings:

```txt
FRIEND_GAMES_PASSWORD=choose-a-password
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optional, but Space Crew Bots uses it for smarter bot movement and meetings when it is present.

## Change the Password

Change the value of `FRIEND_GAMES_PASSWORD` when you start the server. The password is checked in `server.js` and is not hardcoded in the browser files.

## Add a Game

The comments in `public/assets/games-data.js` show the main steps:

1. Add a catalog object to `window.FRIEND_GAMES`.
2. Create a matching page in `public/games`.
3. Add a renderer function and map entry in `public/assets/games.js`.
