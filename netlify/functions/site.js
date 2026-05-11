const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { listHtmlGames } = require("../../games/lib/games-catalog");

const PUBLIC_DIR_CANDIDATES = [
  path.join(process.cwd(), "games", "public"),
  path.join(process.cwd(), "public"),
  path.join(__dirname, "../../games/public")
];
const PUBLIC_DIR = PUBLIC_DIR_CANDIDATES.find((dir) => fs.existsSync(path.join(dir, "login.html"))) ||
  PUBLIC_DIR_CANDIDATES[0];
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

const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);

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

function isAuthed(event) {
  return parseCookies(event.headers.cookie || event.headers.Cookie)[COOKIE_NAME] === authToken();
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
    body: JSON.stringify(body)
  };
}

function redirect(location, headers = {}) {
  return {
    statusCode: 302,
    headers: { Location: location, ...headers },
    body: ""
  };
}

function readBody(event) {
  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "{}";
    return JSON.parse(rawBody || "{}");
  } catch {
    return null;
  }
}

function publicFilePath(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const filePath = cleanPath === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, cleanPath);
  const normalized = path.normalize(filePath);
  return normalized.startsWith(PUBLIC_DIR) ? normalized : null;
}

function serveFile(event, requestPath) {
  const isLoginAsset =
    requestPath === "/login.html" ||
    requestPath === "/assets/styles.css" ||
    requestPath === "/assets/login.js" ||
    requestPath === "/assets/TahoeDawn.jpg";

  if (!isLoginAsset && !isAuthed(event)) {
    return redirect("/login.html");
  }

  const filePath = publicFilePath(requestPath);
  if (!filePath) {
    return { statusCode: 403, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: "Forbidden" };
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: "Not found" };
  }

  const ext = path.extname(filePath);
  const data = fs.readFileSync(filePath);
  const isText = textExtensions.has(ext);

  const cacheControl = requestPath.match(/\.(png|jpe?g|svg|ico)$/)
    ? "public, max-age=31536000, immutable"
    : "no-cache";

  return {
    statusCode: 200,
    headers: {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": cacheControl
    },
    body: isText ? data.toString("utf8") : data.toString("base64"),
    isBase64Encoded: !isText
  };
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
  return data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text || "";
}

async function callOpenAI({ instructions, input }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({ model: OPENAI_MODEL, instructions, input })
  });
  return response.json();
}

async function handleLogin(event) {
  if (!SITE_PASSWORD) {
    return json(500, {
      ok: false,
      message: "The site password is not configured. Set FRIEND_GAMES_PASSWORD in Netlify."
    });
  }

  const body = readBody(event);
  if (!body) {
    return json(400, { ok: false, message: "Invalid request." });
  }

  if (body.password === SITE_PASSWORD) {
    return json(200, { ok: true }, {
      "Set-Cookie": `${COOKIE_NAME}=${authToken()}; HttpOnly; SameSite=Lax; Secure; Path=/`
    });
  }

  return json(401, { ok: false, message: "That password did not match." });
}

async function handleCrewBot(event) {
  if (!isAuthed(event)) {
    return json(401, { ok: false, message: "Log in first." });
  }

  const body = readBody(event);
  if (!body) {
    return json(400, { ok: false, message: "Invalid request." });
  }

  if (!OPENAI_API_KEY) {
    return json(200, { ok: true, source: "local", message: fallbackCrewBot(body) });
  }

  try {
    const data = await callOpenAI({
      instructions:
        "You are a friendly bot in an original space crew deduction game. Reply as one bot in one short sentence.",
      input: `Game state: ${JSON.stringify(body).slice(0, 1800)}`
    });
    return json(200, { ok: true, source: "openai", message: extractResponseText(data) || fallbackCrewBot(body) });
  } catch {
    return json(200, { ok: true, source: "local", message: fallbackCrewBot(body) });
  }
}

async function handleCrewBrain(event) {
  if (!isAuthed(event)) {
    return json(401, { ok: false, message: "Log in first." });
  }

  const body = readBody(event);
  if (!body) {
    return json(400, { ok: false, message: "Invalid request." });
  }

  const fallback = fallbackCrewBrain(body);
  if (!OPENAI_API_KEY) {
    return json(200, { ok: true, source: "local", ...fallback });
  }

  try {
    const data = await callOpenAI({
      instructions:
        "You are the AI director for an original top-down social deduction browser game. Return only valid compact JSON. For action=meeting, return {\"messages\":[short bot discussion lines],\"caughtPlayer\":boolean,\"ejectedName\":\"You or bot name\",\"summary\":\"short result\"}. For action=movement, return {\"goals\":[{\"name\":\"bot name\",\"targetRoom\":\"room name\",\"comment\":\"optional short line\"}]}. Use the supplied evidence, suspicion, bodies, and player behavior. Bots can accuse, lie, split up, investigate bodies, and vote strategically. Keep it game-like and concise.",
      input: JSON.stringify(body).slice(0, 5000)
    });
    const parsed = JSON.parse(extractResponseText(data) || "{}");
    return json(200, { ok: true, source: "openai", ...fallback, ...parsed });
  } catch {
    return json(200, { ok: true, source: "local", ...fallback });
  }
}

exports.handler = async function handler(event) {
  const url = new URL(event.rawUrl || `https://friend-games-hub.local${event.path}`);
  const routedPath = event.queryStringParameters?.path;
  const requestPath = routedPath === undefined ? url.pathname : `/${routedPath}`;
  const method = event.httpMethod;

  if (method === "POST" && requestPath === "/api/login") {
    return handleLogin(event);
  }

  if (method === "POST" && requestPath === "/api/crew-bot") {
    return handleCrewBot(event);
  }

  if (method === "POST" && requestPath === "/api/crew-brain") {
    return handleCrewBrain(event);
  }

  if (method === "GET" && requestPath === "/api/games") {
    if (!isAuthed(event)) {
      return json(401, { ok: false, message: "Log in first." });
    }
    const games = listHtmlGames(PUBLIC_DIR);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ ok: true, games })
    };
  }

  if (requestPath === "/logout" || requestPath === "/api/logout") {
    return redirect("/login.html", {
      "Set-Cookie": `${COOKIE_NAME}=; Max-Age=0; HttpOnly; SameSite=Lax; Secure; Path=/`
    });
  }

  if (method !== "GET" && method !== "HEAD") {
    return { statusCode: 405, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: "Method not allowed" };
  }

  return serveFile(event, requestPath);
};
