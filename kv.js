let kvInstance = null;
export async function getKv() {
  if (kvInstance) return kvInstance;
  kvInstance = await Deno.openKv();
  return kvInstance;
}

// ---------- Clones (also doubles as the clone-request record via `status`) ----------

export async function saveClone(botId, data) {
  const kv = await getKv();
  await kv.set(["clones", botId], data);
}

export async function getClone(botId) {
  const kv = await getKv();
  const r = await kv.get(["clones", botId]);
  return r.value;
}

export async function deleteClone(botId) {
  const kv = await getKv();
  await kv.delete(["clones", botId]);
}

export async function listClones(statusFilter = null) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["clones"] })) {
    if (!statusFilter || entry.value.status === statusFilter) out.push(entry.value);
  }
  return out;
}

// ---------- Storage channels (multiple per bot) ----------

export async function addStorageChannel(botId, channelId, title) {
  const kv = await getKv();
  await kv.set(["storage", botId, String(channelId)], { channel_id: channelId, title, added_at: Date.now() });
}

export async function listStorageChannels(botId) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["storage", botId] })) out.push(entry.value);
  return out;
}

export async function removeStorageChannel(botId, channelId) {
  const kv = await getKv();
  await kv.delete(["storage", botId, String(channelId)]);
}

// ---------- Force-sub channels/groups (multiple per bot) ----------

export async function addForcesubChannel(botId, channelId, title, chatType) {
  const kv = await getKv();
  await kv.set(["forcesub", botId, String(channelId)], { channel_id: channelId, title, chat_type: chatType, added_at: Date.now() });
}

export async function listForcesubChannels(botId) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["forcesub", botId] })) out.push(entry.value);
  return out;
}

export async function removeForcesubChannel(botId, channelId) {
  const kv = await getKv();
  await kv.delete(["forcesub", botId, String(channelId)]);
}

// ---------- Settings (per bot) ----------

const DEFAULT_SETTINGS = { autodelete_minutes: 10, protect_content: 1, shortener_enabled: 0, shortener_time: 960, welcome_images: [] };

export async function getSettings(botId) {
  const kv = await getKv();
  const r = await kv.get(["settings", botId]);
  return r.value ? { ...DEFAULT_SETTINGS, ...r.value } : { ...DEFAULT_SETTINGS };
}

export async function updateSetting(botId, field, value) {
  const current = await getSettings(botId);
  current[field] = value;
  const kv = await getKv();
  await kv.set(["settings", botId], current);
}

// ---------- Shortener accounts (multiple per bot) ----------

export async function addShortener(botId, siteUrl, apiKey) {
  const kv = await getKv();
  const id = crypto.randomUUID().slice(0, 8);
  await kv.set(["shorteners", botId, id], { id, site_url: siteUrl, api_key: apiKey });
  return id;
}

export async function listShorteners(botId) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["shorteners", botId] })) out.push(entry.value);
  return out;
}

export async function removeShortener(botId, id) {
  const kv = await getKv();
  await kv.delete(["shorteners", botId, id]);
}

// ---------- Verified passes (shortener bypass window) ----------

export async function setVerified(botId, userId, minutes) {
  const kv = await getKv();
  await kv.set(["verified", botId, String(userId)], { valid_until: Date.now() + minutes * 60 * 1000 });
}

export async function isVerified(botId, userId) {
  const kv = await getKv();
  const r = await kv.get(["verified", botId, String(userId)]);
  return !!(r.value && r.value.valid_until > Date.now());
}

// ---------- Short-lived "pass" tokens (for shortener redirect flow) ----------

export async function savePassToken(token, data, ttlMinutes = 15) {
  const kv = await getKv();
  await kv.set(["passes", token], data, { expireIn: ttlMinutes * 60 * 1000 });
}

export async function getPassToken(token) {
  const kv = await getKv();
  const r = await kv.get(["passes", token]);
  return r.value;
}

export async function deletePassToken(token) {
  const kv = await getKv();
  await kv.delete(["passes", token]);
}

// ---------- FSM state (per user per bot, for multi-step commands) ----------

export async function getState(botId, userId) {
  const kv = await getKv();
  const r = await kv.get(["states", botId, String(userId)]);
  return r.value;
}

export async function setState(botId, userId, state) {
  const kv = await getKv();
  await kv.set(["states", botId, String(userId)], state, { expireIn: 30 * 60 * 1000 }); // auto-clears after 30 min if abandoned
}

export async function clearState(botId, userId) {
  const kv = await getKv();
  await kv.delete(["states", botId, String(userId)]);
}

// ---------- Users seen per bot (for /broadcast targeting) ----------

export async function recordUser(botId, userId) {
  const kv = await getKv();
  const key = ["users", botId, String(userId)];
  const existing = await kv.get(key);
  if (!existing.value) await kv.set(key, { first_seen: Date.now() });
}

export async function listUsers(botId) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["users", botId] })) out.push(entry.key[2]);
  return out;
}

// ---------- Pending auto-deletes ----------

export async function schedulePendingDelete(botId, chatId, messageId, minutes) {
  const kv = await getKv();
  const id = crypto.randomUUID();
  await kv.set(["pending_deletes", id], { bot_id: botId, chat_id: chatId, message_id: messageId, delete_at: Date.now() + minutes * 60 * 1000 });
}

export async function listDuePendingDeletes(limit = 50) {
  const kv = await getKv();
  const now = Date.now();
  const due = [];
  for await (const entry of kv.list({ prefix: ["pending_deletes"] }, { limit: 200 })) {
    if (entry.value.delete_at <= now) due.push({ key: entry.key, value: entry.value });
    if (due.length >= limit) break;
  }
  return due;
}

export async function removePendingDelete(key) {
  const kv = await getKv();
  await kv.delete(key);
}

// ---------- Broadcast queue ----------

export async function enqueueBroadcast(botId, fromChatId, messageId, targetUids) {
  const kv = await getKv();
  const now = Date.now();
  let ops = kv.atomic();
  let count = 0;
  for (const uid of targetUids) {
    const id = crypto.randomUUID();
    ops = ops.set(["broadcast_queue", id], { bot_id: botId, from_chat_id: fromChatId, message_id: messageId, target_uid: uid, created_at: now });
    count++;
    if (count % 100 === 0) {
      await ops.commit();
      ops = kv.atomic();
    }
  }
  await ops.commit();
}

export async function popBroadcastBatch(limit = 20) {
  const kv = await getKv();
  const out = [];
  for await (const entry of kv.list({ prefix: ["broadcast_queue"] }, { limit })) {
    out.push({ key: entry.key, value: entry.value });
  }
  return out;
}

export async function removeBroadcastItem(key) {
  const kv = await getKv();
  await kv.delete(key);
}

// ---------- Reply bridge (owner <-> requester chat) ----------

export async function saveBridge(ownerChatId, ownerMsgId, requesterUid) {
  const kv = await getKv();
  await kv.set(["bridge", String(ownerChatId), String(ownerMsgId)], { requester_uid: requesterUid }, { expireIn: 30 * 24 * 60 * 60 * 1000 });
}

export async function findBridge(ownerChatId, ownerMsgId) {
  const kv = await getKv();
  const r = await kv.get(["bridge", String(ownerChatId), String(ownerMsgId)]);
  return r.value;
}
