// ---------- Hardcoded config ----------
// Add/remove owner Telegram User IDs here (comma separated numbers).
export const OWNERS = [5351848105, 5344078567];

// ---------- Environment variables (set these in Deno Deploy dashboard) ----------
export function env(key, def = "") {
  try {
    return Deno.env.get(key) || def;
  } catch {
    return def;
  }
}

// BOT_TOKEN       - your MAIN bot's token (the one users message to request a clone)
// WEBHOOK_SECRET  - any random string, must match what you pass to Telegram's setWebhook
// LINK_SECRET_KEY - a long random string used to sign get/batch links — KEEP PRIVATE.
//                   If this leaks, anyone could forge file links. Never use the
//                   placeholder default in production; always set your own.
export const BOT_TOKEN = env("BOT_TOKEN");
export const WEBHOOK_SECRET = env("WEBHOOK_SECRET", "change_me");
export const LINK_SECRET_KEY = env("LINK_SECRET_KEY", "");

export const MAX_BATCH_PER_REQUEST = 25; // how many files /getlink+/batch delivers in one go
export const DEFAULT_AUTODELETE_MIN = 10;
export const DEFAULT_SHORTENER_MIN = 960; // 16h
