const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { listHtmlGames } = require("../lib/games-catalog");

const PUBLIC_DIR = path.join(process.cwd(), "public");
const SITE_PASSWORD = process.env.FRIEND_GAMES_PASSWORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const COOKIE_NAME = "friend_games_auth";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function authToken() {
  return crypto.createHash("sha256").update(`friend-games:${SITE_PASSWORD || "missing"}`).digest("hex");
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function isAuthed(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] === authToken();
}

function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  Object.entries({ "Content-Type": "application/json; charset=utf-8", ...headers }).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end(JSON.stringify(body));
}

function redirect(res, location, headers = {}) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end();
}

function getBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = "";
    req.on("data", (chunk) => {
      rawBody += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(rawBody || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function publicFilePath(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath =
    cleanPath === "/"
      ? path.join(PUBLIC_DIR, "index.html")
      : path.join(PUBLIC_DIR, cleanPath);
  const normalized = path.normalize(filePath);
  return normalized.startsWith(PUBLIC_DIR) ? normalized : null;
}

function serveFile(req, res, requestPath) {
  const isLoginAsset =
    requestPath === "/login.html" ||
    requestPath === "/assets/styles.css" ||
    requestPath === "/assets/login.js" ||
    requestPath === "/assets/TahoeDawn.jpg";

  if (!isLoginAsset && !isAuthed(req)) {
    redirect(res, "/login.html");
    return;
  }

  const filePath = publicFilePath(requestPath);
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    if (requestPath.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    res.end(data);
  });
}

function fallbackCrewBot(body) {
  const names = ["Milo", "Ari", "Nova", "Sam", "Jules"];
  const speaker = body.speaker || names[Math.floor(Math.random() * names.length)];
  const lines = [
    `${speaker}: I finished a task near the garden room.`,
    `${speaker}: I saw someone hurry past the engine hall.`,
    `${speaker}: Let's compare tasks before voting.`,
    `${speaker}: I am not sure yet, but quiet players can be suspicious.`,
    `${speaker}: I think we should ask for one more clue.`
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function fallbackCrewBrain(body) {
  const aliveBots = body.aliveBots || ["Milo", "Ari", "Nova", "Sam", "Jules"];
  const rooms = body.rooms || ["Cafeteria", "Weapons", "Navigation", "Med Bay", "Electrical", "Engine"];

  if (body.action === "movement") {
    return {
      goals: aliveBots.map((name, index) => ({
        name,
        targetRoom: rooms[(index + Math.floor(Math.random() * rooms.length)) % rooms.length],
        comment: Math.random() < 0.25 ? `${name}: heading to check tasks.` : ""
      }))
    };
  }

  const mostSuspicious =
    (body.suspicions || []).sort((a, b) => b.suspicion - a.suspicion)[0]?.name || aliveBots[0];
  const caughtPlayer = Math.random() < Math.min(0.78, 0.14 + (body.bodyCount || 0) * 0.14);

  return {
    messages: [
      `${aliveBots[0] || "Milo"}: I want everyone to explain where they were.`,
      `${aliveBots[1] || "Ari"}: The timing feels suspicious near ${body.reason || "the report"}.`,
      `${aliveBots[2] || "Nova"}: I am voting based on who was closest.`
    ],
    caughtPlayer,
    ejectedName: caughtPlayer ? "You" : mostSuspicious,
    summary: caughtPlayer ? "The crew connected the clues and voted you out." : `${mostSuspicious} got the most votes.`
  };
}

function extractResponseText(data) {
  return (
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text ||
    ""
  );
}

async function callOpenAI({ instructions, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions,
      input
    })
  });
  return response.json();
}

async function handleLogin(req, res) {
  if (!SITE_PASSWORD) {
    sendJson(res, 500, {
      ok: false,
      message: "The site password is not configured. Set FRIEND_GAMES_PASSWORD in Vercel."
    });
    return;
  }

  let body;
  try {
    body = await getBody(req);
  } catch {
    sendJson(res, 400, { ok: false, message: "Invalid request." });
    return;
  }

  if (body.password === SITE_PASSWORD) {
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `${COOKIE_NAME}=${authToken()}; HttpOnly; SameSite=Lax; Secure; Path=/`
    });
    return;
  }

  sendJson(res, 401, { ok: false, message: "That password did not match." });
}

async function handleCrewBot(req, res) {
  if (!isAuthed(req)) {
    sendJson(res, 401, { ok: false, message: "Log in first." });
    return;
  }

  let body;
  try {
    body = await getBody(req);
  } catch {
    sendJson(res, 400, { ok: false, message: "Invalid request." });
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(res, 200, { ok: true, source: "local", message: fallbackCrewBot(body) });
    return;
  }

  try {
    const data = await callOpenAI({
      instructions:
        "You are a friendly bot in an original space crew deduction game. Reply as one bot in one short sentence.",
      input: `Game state: ${JSON.stringify(body).slice(0, 1800)}`
    });
    sendJson(res, 200, { ok: true, source: "openai", message: extractResponseText(data) || fallbackCrewBot(body) });
  } catch {
    sendJson(res, 200, { ok: true, source: "local", message: fallbackCrewBot(body) });
  }
}

async function handleCrewBrain(req, res) {
  if (!isAuthed(req)) {
    sendJson(res, 401, { ok: false, message: "Log in first." });
    return;
  }

  let body;
  try {
    body = await getBody(req);
  } catch {
    sendJson(res, 400, { ok: false, message: "Invalid request." });
    return;
  }

  const fallback = fallbackCrewBrain(body);
  if (!OPENAI_API_KEY) {
    sendJson(res, 200, { ok: true, source: "local", ...fallback });
    return;
  }

  try {
    const data = await callOpenAI({
      instructions:
        "You are the AI director for an original top-down social deduction browser game. Return only valid compact JSON. For action=meeting, return {\"messages\":[short bot discussion lines],\"caughtPlayer\":boolean,\"ejectedName\":\"You or bot name\",\"summary\":\"short result\"}. For action=movement, return {\"goals\":[{\"name\":\"bot name\",\"targetRoom\":\"room name\",\"comment\":\"optional short line\"}]}. Use the supplied evidence, suspicion, bodies, and player behavior. Bots can accuse, lie, split up, investigate bodies, and vote strategically. Keep it game-like and concise.",
      input: JSON.stringify(body).slice(0, 5000)
    });
    const parsed = JSON.parse(extractResponseText(data) || "{}");
    sendJson(res, 200, { ok: true, source: "openai", ...fallback, ...parsed });
  } catch {
    sendJson(res, 200, { ok: true, source: "local", ...fallback });
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, "https://friend-games-hub.local");
  const rewrittenPath = url.searchParams.get("path");
  const requestPath = url.searchParams.has("path")
    ? `/${rewrittenPath || ""}`
    : url.pathname;

  if (req.method === "POST" && requestPath === "/api/login") {
    await handleLogin(req, res);
    return;
  }

  if (req.method === "POST" && requestPath === "/api/crew-bot") {
    await handleCrewBot(req, res);
    return;
  }

  if (req.method === "POST" && requestPath === "/api/crew-brain") {
    await handleCrewBrain(req, res);
    return;
  }

  if (req.method === "GET" && requestPath === "/api/games") {
    if (!isAuthed(req)) {
      sendJson(res, 401, { ok: false, message: "Log in first." });
      return;
    }
    const games = listHtmlGames(PUBLIC_DIR);
    sendJson(res, 200, { ok: true, games }, { "Cache-Control": "no-store" });
    return;
  }

  if (requestPath === "/logout" || requestPath === "/api/logout") {
    redirect(res, "/login.html", {
      "Set-Cookie": `${COOKIE_NAME}=; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Path=/`
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  serveFile(req, res, requestPath);
};
