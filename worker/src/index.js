import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors());

// --- JWT helpers using Web Crypto ---

const encoder = new TextEncoder();

function getSecret(c) {
  return c.env.JWT_SECRET || "dukou-jwt-secret-dev-only";
}

async function base64urlEncode(data) {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  const buf = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return `${signingInput}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      c => c.charCodeAt(0)
    );
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(signingInput));
    if (!valid) return null;

    const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function authMiddleware(c, next) {
  const auth = c.req.header("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return c.json({ error: "未登录" }, 401);
  const secret = getSecret(c);
  const payload = await verifyJWT(token, secret);
  if (!payload) return c.json({ error: "登录过期，请重新登录" }, 401);
  c.set("userId", payload.sub);
  c.set("username", payload.username);
  await next();
}

// --- Auth ---

app.post("/api/auth/register", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: "用户名和密码不能为空" }, 400);
  if (password.length < 6) return c.json({ error: "密码至少 6 位" }, 400);

  const db = c.env.DB;
  const existing = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
  if (existing) return c.json({ error: "用户名已存在" }, 409);

  const id = `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const hash = await base64urlEncode(password + username);
  await db.prepare("INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)").bind(id, username, hash).run();

  const secret = getSecret(c);
  const token = await signJWT({
    sub: id,
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  }, secret);

  return c.json({ ok: true, token, user: { id, username } });
});

app.post("/api/auth/login", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: "用户名和密码不能为空" }, 400);

  const db = c.env.DB;
  const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!user) return c.json({ error: "用户名或密码错误" }, 401);

  const expectedHash = await base64urlEncode(password + username);
  if (user.password_hash !== expectedHash) return c.json({ error: "用户名或密码错误" }, 401);

  const secret = getSecret(c);
  const token = await signJWT({
    sub: user.id,
    username: user.username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  }, secret);

  return c.json({ ok: true, token, user: { id: user.id, username: user.username } });
});

// --- Settings ---

app.get("/api/settings", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const rows = await db.prepare("SELECT key, value FROM settings WHERE user_id = ?").bind(userId).all();
  const settings = {};
  for (const row of rows.results) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return c.json(settings);
});

app.put("/api/settings", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const db = c.env.DB;

  const stmts = [];
  for (const [key, value] of Object.entries(body)) {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    stmts.push(db.prepare(
      "INSERT INTO settings (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    ).bind(userId, key, strValue));
  }

  await db.batch(stmts);
  return c.json({ ok: true });
});

// --- Characters ---

app.get("/api/characters", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const db = c.env.DB;
  const rows = await db.prepare("SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all();
  const chars = rows.results.map(rowToCharacter);
  return c.json(chars);
});

app.post("/api/characters", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const db = c.env.DB;

  const id = body.id || `char_custom_${Date.now()}`;
  const chatSpaceId = body.chatSpaceId || id;

  await db.prepare(`INSERT INTO characters (id, user_id, name, avatar_initial, description, personality, backstory, orientation, custom_orientation, relationship_modes, custom_relationship, involved_characters, kinks, pure_love_mode, model_provider, model_api_key, model_name, model_base_url, voice_id, tts_enabled, stt_enabled, chat_space_id, status, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id, userId,
      body.name || "", body.avatarInitial || (body.name || "?").slice(0, 1),
      body.description || "", body.personality || "", body.backstory || "",
      body.orientation || "", body.customOrientation || "",
      JSON.stringify(body.relationshipModes || []),
      body.customRelationship || "", JSON.stringify(body.involvedCharacters || []),
      JSON.stringify(body.kinks || []), body.pureLoveMode ? 1 : 0,
      body.modelProvider || "", body.modelApiKey || "", body.modelName || "", body.modelBaseUrl || "",
      body.voiceId || "", body.ttsEnabled ? 1 : 0, body.sttEnabled ? 1 : 0,
      chatSpaceId, body.status || "pending", body.isDefault ? 1 : 0
    ).run();

  const row = await db.prepare("SELECT * FROM characters WHERE id = ?").bind(id).first();
  return c.json(rowToCharacter(row), 201);
});

app.put("/api/characters/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.DB;

  const existing = await db.prepare("SELECT id FROM characters WHERE id = ? AND user_id = ?").bind(id, userId).first();
  if (!existing) return c.json({ error: "角色不存在" }, 404);

  const fields = ["name","avatar_initial","description","personality","backstory","orientation","custom_orientation",
    "relationship_modes","custom_relationship","involved_characters","kinks","pure_love_mode",
    "model_provider","model_api_key","model_name","model_base_url","voice_id","tts_enabled","stt_enabled","status"];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const val = ["relationship_modes","involved_characters","kinks"].includes(f)
        ? JSON.stringify(body[f])
        : (typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
      sets.push(`${f} = ?`);
      vals.push(val);
    }
  }
  if (sets.length === 0) return c.json({ ok: true });

  vals.push(id, userId);
  await db.prepare(`UPDATE characters SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();

  const row = await db.prepare("SELECT * FROM characters WHERE id = ?").bind(id).first();
  return c.json(rowToCharacter(row));
});

app.delete("/api/characters/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = c.env.DB;
  await db.prepare("DELETE FROM characters WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.json({ ok: true });
});

function rowToCharacter(row) {
  if (!row) return null;
  const parseJSON = (str, fallback) => { try { return JSON.parse(str); } catch { return fallback; } };
  return {
    id: row.id,
    name: row.name,
    avatarInitial: row.avatar_initial,
    description: row.description,
    personality: row.personality,
    backstory: row.backstory,
    orientation: row.orientation,
    customOrientation: row.custom_orientation,
    relationshipModes: parseJSON(row.relationship_modes, []),
    customRelationship: row.custom_relationship,
    involvedCharacters: parseJSON(row.involved_characters, []),
    kinks: parseJSON(row.kinks, []),
    pureLoveMode: !!row.pure_love_mode,
    modelProvider: row.model_provider,
    modelApiKey: row.model_api_key,
    modelName: row.model_name,
    modelBaseUrl: row.model_base_url,
    voiceId: row.voice_id,
    ttsEnabled: !!row.tts_enabled,
    sttEnabled: !!row.stt_enabled,
    chatSpaceId: row.chat_space_id,
    status: row.status,
    isDefault: !!row.is_default,
    createdAt: row.created_at,
  };
}

// --- Character Memories ---

app.get("/api/memories/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const limit = Math.min(Number(c.req.query("limit") || "20"), 100);
  const db = c.env.DB;

  const rows = await db.prepare(
    "SELECT * FROM character_memories WHERE user_id = ? AND chat_space_id = ? ORDER BY created_at DESC LIMIT ?"
  ).bind(userId, chatSpaceId, limit).all();

  return c.json(rows.results.map(r => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
  })));
});

app.post("/api/memories/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const body = await c.req.json();
  const db = c.env.DB;

  const items = Array.isArray(body.items) ? body.items : (body.text ? [{ text: body.text }] : []);
  if (items.length === 0) return c.json({ error: "没有要保存的记忆" }, 400);

  const stmts = items.map(item => {
    const id = `mem-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    return db.prepare(
      "INSERT INTO character_memories (id, user_id, chat_space_id, text) VALUES (?, ?, ?, ?)"
    ).bind(id, userId, chatSpaceId, String(item.text || "").trim());
  });

  await db.batch(stmts);
  return c.json({ ok: true, count: items.length }, 201);
});

// --- Messages ---

app.get("/api/messages/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const limit = Math.min(Number(c.req.query("limit") || "50"), 200);
  const before = c.req.query("before");
  const db = c.env.DB;

  let query = "SELECT * FROM messages WHERE user_id = ? AND chat_space_id = ? AND deleted_at IS NULL AND superseded_at IS NULL";
  const params = [userId, chatSpaceId];
  if (before) { query += " AND created_at < ?"; params.push(before); }
  query += " ORDER BY created_at ASC LIMIT ?";
  params.push(limit);

  const rows = await db.prepare(query).bind(...params).all();
  return c.json(rows.results.map(rowToMessage));
});

app.post("/api/messages", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const db = c.env.DB;

  const id = body.id || `msg-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const quote = body.quote ? JSON.stringify(body.quote) : null;
  const meta = body.meta ? JSON.stringify(body.meta) : "{}";

  await db.prepare(`INSERT INTO messages (id, user_id, chat_space_id, conversation_id, session_id, role, content, quote, reasoning_content, reasoning_source, reasoning_visible, response_group_id, status, read_by_user, read_by_du, excluded_from_context, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      id, userId,
      body.chatSpaceId || "main", body.conversationId || body.chatSpaceId || "main",
      body.sessionId || null, body.role || "user", body.content || "",
      quote, body.reasoningContent || "", body.reasoningSource || null,
      body.reasoningVisible ? 1 : 0, body.responseGroupId || null,
      body.status || "sent", body.readByUser !== false ? 1 : 0, body.readByDu !== false ? 1 : 0,
      body.excludedFromContext ? 1 : 0, meta, body.createdAt || new Date().toISOString()
    ).run();

  return c.json({ ok: true, id }, 201);
});

app.put("/api/messages/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const db = c.env.DB;

  const existing = await db.prepare("SELECT id FROM messages WHERE id = ? AND user_id = ?").bind(id, userId).first();
  if (!existing) return c.json({ error: "消息不存在" }, 404);

  const fields = ["status","read_by_user","read_by_du","excluded_from_context","deleted_at","superseded_at",
    "reasoning_visible","content","quote","meta","reasoning_content"];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      const val = f === "quote" || f === "meta" ? JSON.stringify(body[f])
        : (typeof body[f] === "boolean" ? (body[f] ? 1 : 0) : body[f]);
      sets.push(`${f} = ?`);
      vals.push(val);
    }
  }
  if (sets.length === 0) return c.json({ ok: true });

  vals.push(id, userId);
  await db.prepare(`UPDATE messages SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals).run();

  return c.json({ ok: true });
});

function rowToMessage(row) {
  if (!row) return null;
  const parseJSON = (str, fb) => { try { return JSON.parse(str); } catch { return fb; } };
  return {
    id: row.id,
    session_id: row.session_id,
    conversationId: row.conversation_id,
    chatSpaceId: row.chat_space_id,
    role: row.role,
    content: row.content,
    quote: parseJSON(row.quote, null),
    reasoningContent: row.reasoning_content,
    reasoningSource: row.reasoning_source,
    reasoningVisible: !!row.reasoning_visible,
    responseGroupId: row.response_group_id,
    status: row.status,
    read_by_user: !!row.read_by_user,
    read_by_du: !!row.read_by_du,
    excludedFromContext: !!row.excluded_from_context,
    deletedAt: row.deleted_at,
    supersededAt: row.superseded_at,
    meta: parseJSON(row.meta, {}),
    created_at: row.created_at,
  };
}

// --- Health ---

app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

export default app;
