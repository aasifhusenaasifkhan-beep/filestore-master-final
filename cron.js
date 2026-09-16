import { api } from "./telegram.js";
import { BOT_TOKEN } from "./config.js";
import * as kv from "./kv.js";

async function resolveToken(botId) {
  if (botId === "main") return BOT_TOKEN;
  const clone = await kv.getClone(botId);
  return clone ? clone.bot_token : null;
}

export async function runCleanupJob() {
  // 1. delete expired delivered files
  const due = await kv.listDuePendingDeletes(50);
  for (const item of due) {
    const token = await resolveToken(item.value.bot_id);
    if (token) {
      const tg = api(token);
      await tg.deleteMessage(item.value.chat_id, item.value.message_id).catch(() => {});
    }
    await kv.removePendingDelete(item.key);
  }

  // 2. drain a batch of the broadcast queue
  const batch = await kv.popBroadcastBatch(20);
  for (const item of batch) {
    const token = await resolveToken(item.value.bot_id);
    if (token) {
      const tg = api(token);
      await tg.copyMessage(item.value.target_uid, item.value.from_chat_id, item.value.message_id).catch(() => {});
    }
    await kv.removeBroadcastItem(item.key);
  }
}
