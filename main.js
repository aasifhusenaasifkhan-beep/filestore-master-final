import { BOT_TOKEN, WEBHOOK_SECRET } from "./config.js";
import { handleMainBot } from "./mainbot.js";
import { handleCloneBot } from "./storebot.js";
import { runCleanupJob } from "./cron.js";

// Runs every minute: auto-deletes expired delivered files, drains broadcast queue.
// Deno Deploy runs Deno.cron natively — no external scheduler needed.
Deno.cron("cleanup", "* * * * *", async () => {
  await runCleanupJob();
});

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>File Store Bot</title></head>
       <body style="background:#121212;color:#fff;text-align:center;padding:50px;font-family:sans-serif">
       <h1 style="color:#0088cc">🚀 File Store Bot — Deno Deploy</h1>
       <p>Bot is LIVE ✅</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!BOT_TOKEN) return new Response("BOT_TOKEN not set", { status: 500 });

  const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretHeader !== WEBHOOK_SECRET) return new Response("Unauthorized", { status: 401 });

  let update;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const origin = url.origin;

  try {
    if (url.pathname === "/tg/main") {
      await handleMainBot(update, origin);
    } else if (url.pathname.startsWith("/tg/clone/")) {
      const botId = url.pathname.split("/").pop();
      if (botId) await handleCloneBot(update, botId, origin);
    }
  } catch (e) {
    console.error("Update handling error:", e);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
