const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");

// Change the site password by setting this environment variable before starting:
// FRIEND_GAMES_PASSWORD="your new password" npm start
// The password is intentionally not hardcoded in this project.
const SITE_PASSWORD = process.env.FRIEND_GAMES_PASSWORD;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const COOKIE_NAME = "friend_games_auth";
const COOKIE_VALUE = crypto
  .createHash("sha256")
  .update(`${SITE_PASSWORD || "missing"}:${process.cwd()}`)
  .digest("hex");

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

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
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
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] === COOKIE_VALUE;
}

function safePublicPath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const filePath =
    cleanPath === "/"
      ? path.join(PUBLIC_DIR, "index.html")
      : path.join(PUBLIC_DIR, cleanPath);

  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return normalized;
}

function serveFile(req, res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const ext = path.extname(filePath);
    send(res, 200, data, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream"
    });
  });
}

function readJsonBody(req, onDone) {
  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    try {
      onDone(null, JSON.parse(rawBody || "{}"));
    } catch {
      onDone(new Error("Invalid JSON"));
    }
  });
}

function handleLogin(req, res) {
  readJsonBody(req, (parseError, body) => {
    if (!SITE_PASSWORD) {
      send(
        res,
        500,
        JSON.stringify({
          ok: false,
          message:
            "The site password is not configured. Set FRIEND_GAMES_PASSWORD before starting the server."
        }),
        { "Content-Type": "application/json; charset=utf-8" }
      );
      return;
    }

    if (parseError) {
      send(res, 400, JSON.stringify({ ok: false, message: "Invalid request." }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    if (body.password === SITE_PASSWORD) {
      send(res, 200, JSON.stringify({ ok: true }), {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `${COOKIE_NAME}=${COOKIE_VALUE}; HttpOnly; SameSite=Lax; Path=/`
      });
      return;
    }

    send(res, 401, JSON.stringify({ ok: false, message: "That password did not match." }), {
      "Content-Type": "application/json; charset=utf-8"
    });
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

async function handleCrewBot(req, res) {
  if (!isAuthed(req)) {
    send(res, 401, JSON.stringify({ ok: false, message: "Log in first." }), {
      "Content-Type": "application/json; charset=utf-8"
    });
    return;
  }

  readJsonBody(req, async (parseError, body) => {
    if (parseError) {
      send(res, 400, JSON.stringify({ ok: false, message: "Invalid request." }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    if (!OPENAI_API_KEY) {
      send(res, 200, JSON.stringify({ ok: true, source: "local", message: fallbackCrewBot(body) }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          instructions:
            "You are a friendly, school-appropriate bot in a simple space crew deduction game. Reply as one bot in one short sentence. Do not mention real violence, gore, or anything scary.",
          input: `Game state: ${JSON.stringify(body).slice(0, 1800)}`
        })
      });
      const data = await response.json();
      const message = extractResponseText(data) || fallbackCrewBot(body);

      send(res, 200, JSON.stringify({ ok: true, source: "openai", message }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    } catch {
      send(res, 200, JSON.stringify({ ok: true, source: "local", message: fallbackCrewBot(body) }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    }
  });
}

async function handleCrewBrain(req, res) {
  if (!isAuthed(req)) {
    send(res, 401, JSON.stringify({ ok: false, message: "Log in first." }), {
      "Content-Type": "application/json; charset=utf-8"
    });
    return;
  }

  readJsonBody(req, async (parseError, body) => {
    if (parseError) {
      send(res, 400, JSON.stringify({ ok: false, message: "Invalid request." }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    const fallback = fallbackCrewBrain(body);
    if (!OPENAI_API_KEY) {
      send(res, 200, JSON.stringify({ ok: true, source: "local", ...fallback }), {
        "Content-Type": "application/json; charset=utf-8"
      });
      return;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          instructions:
            "You are the AI director for an original top-down social deduction browser game. Return only valid compact JSON. For action=meeting, return {\"messages\":[short bot discussion lines],\"caughtPlayer\":boolean,\"ejectedName\":\"You or bot name\",\"summary\":\"short result\"}. For action=movement, return {\"goals\":[{\"name\":\"bot name\",\"targetRoom\":\"room name\",\"comment\":\"optional short line\"}]}. Use the supplied evidence, suspicion, bodies, and player behavior. Bots can accuse, lie, split up, investigate bodies, and vote strategically. Keep it game-like and concise.",
          input: JSON.stringify(body).slice(0, 5000)
        })
      });
      const data = await response.json();
      const text = extractResponseText(data);
      const parsed = text ? JSON.parse(text) : fallback;
      send(res, 200, JSON.stringify({ ok: true, source: "openai", ...fallback, ...parsed }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    } catch {
      send(res, 200, JSON.stringify({ ok: true, source: "local", ...fallback }), {
        "Content-Type": "application/json; charset=utf-8"
      });
    }
  });
}

const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0];

  if (req.method === "POST" && requestPath === "/api/login") {
    handleLogin(req, res);
    return;
  }

  if (req.method === "POST" && requestPath === "/api/crew-bot") {
    handleCrewBot(req, res);
    return;
  }

  if (req.method === "POST" && requestPath === "/api/crew-brain") {
    handleCrewBrain(req, res);
    return;
  }

  if (requestPath === "/logout") {
    send(res, 302, "", {
      Location: "/login.html",
      "Set-Cookie": `${COOKIE_NAME}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/`
    });
    return;
  }

  const filePath = safePublicPath(requestPath);
  if (!filePath) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const isLoginAsset =
    requestPath === "/login.html" ||
    requestPath === "/assets/styles.css" ||
    requestPath === "/assets/login.js";

  if (!isLoginAsset && !isAuthed(req)) {
    send(res, 302, "", { Location: "/login.html" });
    return;
  }

  serveFile(req, res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Friend Games Hub is running at http://${HOST}:${PORT}`);
  if (!SITE_PASSWORD) {
    console.log("Set FRIEND_GAMES_PASSWORD before logging in.");
  }
});
