import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", cors({
  origin: ["https://dukou-site.pages.dev", "https://dukou.pages.dev", "http://localhost:5173"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

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

// --- 情绪-重要性评分（纯本地，不调 API）---

function estimateImportance(text) {
  let score = 0.5;

  const highEmotionPatterns = [
    /[！!]{2,}/,
    /[？?]{2,}/,
    /[～~…]{2,}/,
    /好(开心|高兴|激动|兴奋|爽|棒|幸福|快乐)/,
    /太.*[了啦]/,
    /太(好了|棒了|牛|强|厉害|开心|高兴|感动|难过了|惨了)/,
    /爱(你|死|上|惨|了)/,
    /恨(你|死|不|透)/,
    /气(死|炸|哭|疯|坏)/,
    /哭(了|死|泣|惨|过)/,
    /(永远|一直|绝不|再也|绝对|坚决)/,
    /(最重要|最关键|必须|一定|肯定|确定)/,
    /记住[我了]?/,
    /(梦想|愿望|目标|理想)/,
    /(害怕|恐惧|怕|担心|焦虑|紧张)/,
    /(对不起|抱歉|原谅|后悔|自责)/,
    /(发誓|保证|承诺|约定|说好)/,
    /(喜欢|超爱|好想|想念|想你了)/,
    /(孤独|寂寞|难过|伤心|失望|绝望)/,
    /(第一次|终于|竟然|居然|成功了|考上了|拿到了)/,
    /(真(的|是)|非常|特别|极其|超级|无比)/,
    /(啊啊|呜呜|哈哈|嘿嘿|呵呵|哎)/,
    /(不要|别走|别离开|陪我)/,
  ];

  const lowEmotionPatterns = [
    /^(嗯|哦|好|行|可|对|是|吃|睡)[了过]?$/,
    /^(早安|晚安|早|拜|再见|回头)[了过]?$/,
  ];

  let hitCount = 0;
  for (const pattern of highEmotionPatterns) {
    if (pattern.test(text)) hitCount++;
  }
  score = Math.min(1.0, score + hitCount * 0.12);

  for (const pattern of lowEmotionPatterns) {
    if (pattern.test(text)) score = Math.max(0.2, score - 0.2);
  }

  // 文字越长越可能重要
  if (text.length > 50) score = Math.min(1.0, score + 0.05);
  if (text.length > 150) score = Math.min(1.0, score + 0.05);

  return Math.round(score * 100) / 100;
}


// --- Character Memories (改进版 - 支持向量化) ---

app.get("/api/memories/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const limit = Math.min(Number(c.req.query("limit") || "20"), 100);
  const db = c.env.DB;

  const rows = await db.prepare(
    "SELECT * FROM character_memories WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 ORDER BY pinned DESC, created_at DESC LIMIT ?"
  ).bind(userId, chatSpaceId, limit).all();

  return c.json(rows.results.map(rowToMemory));
});

app.get("/api/memories/search/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const query = c.req.query("q") || "";
  const limit = Math.min(Number(c.req.query("limit") || "5"), 20);
  const db = c.env.DB;

  if (!query.trim()) {
    const rows = await db.prepare(
      "SELECT * FROM character_memories WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 ORDER BY pinned DESC, last_accessed DESC LIMIT ?"
    ).bind(userId, chatSpaceId, limit).all();
    return c.json(rows.results.map(rowToMemory));
  }

  try {
    // 生成查询向量
    const queryVector = await generateEmbedding(query, c.env);
    if (!queryVector) {
      // 降级到全文搜索
      const rows = await db.prepare(
        `SELECT * FROM character_memories
         WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 AND (text LIKE ? OR text LIKE ?)
         ORDER BY pinned DESC, created_at DESC LIMIT ?`
      ).bind(userId, chatSpaceId, `%${query}%`, `%${query}%`, limit).all();
      return c.json(rows.results.map(rowToMemory));
    }

    // 向量检索
    const allMemories = await db.prepare(
      "SELECT * FROM character_memories WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 AND embedding IS NOT NULL"
    ).bind(userId, chatSpaceId).all();

    const scored = allMemories.results
      .map(mem => {
        const vectorSim = cosineSimilarity(queryVector, decodeEmbedding(mem.embedding));
        const heat = calculateEffectiveHeat(mem);
        // 热度融入相似度：最终得分 = 向量相似度 × 热度（热度永远不归零，保底 0.1）
        const finalScore = vectorSim * Math.max(0.1, heat);
        return { ...mem, similarity: finalScore, vectorSimilarity: vectorSim, effectiveHeat: heat };
      })
      .sort((a, b) => {
        // pinned 永远排第一
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.similarity - a.similarity;
      })
      .slice(0, limit);

    // 更新访问时间
    const updateStmts = scored.map(mem =>
      db.prepare("UPDATE character_memories SET last_accessed = datetime('now') WHERE id = ?").bind(mem.id)
    );
    if (updateStmts.length > 0) {
      await db.batch(updateStmts);
    }

    return c.json(scored.map(rowToMemory));
  } catch (err) {
    console.error("向量检索失败:", err);
    return c.json({ error: "检索失败" }, 500);
  }
});

app.post("/api/memories/:chatSpaceId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const body = await c.req.json();
  const db = c.env.DB;

  const items = Array.isArray(body.items) ? body.items : (body.text ? [{ text: body.text }] : []);
  if (items.length === 0) return c.json({ error: "没有要保存的记忆" }, 400);

  const stmts = [];
  const newIds = [];

  for (const item of items) {
    const id = `mem-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const text = String(item.text || "").trim();
    const importance = estimateImportance(text);
    const decayFactor = importance > 0.7 ? 0.008 : 0.02;

    newIds.push({ id, text });

    let embedding = null;
    try {
      const vector = await generateEmbedding(text, c.env);
      if (vector) {
        embedding = encodeEmbedding(vector);
      }
    } catch (err) {
      console.error("向量化失败:", err);
    }

    stmts.push(
      db.prepare(`
        INSERT INTO character_memories
        (id, user_id, chat_space_id, text, embedding, embedding_model, semantic_type, importance, reference_message_id, archived, heat, decay_factor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?)
      `).bind(
        id, userId, chatSpaceId, text,
        embedding, embedding ? "text-embedding-3-small" : null,
        item.type || "event",
        importance,
        item.referenceMessageId || null,
        0,
        decayFactor
      )
    );
  }

  await db.batch(stmts);

  // 对每条新记忆做矛盾检测
  for (const { id, text } of newIds) {
    if (!text) continue;
    try {
      const vec = await generateEmbedding(text, c.env);
      if (vec) {
        await detectAndMarkContradiction(db, userId, chatSpaceId, id, text, encodeEmbedding(vec));
      }
    } catch {}
  }

  return c.json({ ok: true, count: items.length }, 201);
});

// --- 记忆锁定/解锁 ---

app.post("/api/memories/:chatSpaceId/pin/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = c.env.DB;

  const existing = await db.prepare(
    "SELECT id FROM character_memories WHERE id = ? AND user_id = ?"
  ).bind(id, userId).first();
  if (!existing) return c.json({ error: "记忆不存在" }, 404);

  await db.prepare(
    "UPDATE character_memories SET pinned = 1, updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  return c.json({ ok: true, pinned: true });
});

app.delete("/api/memories/:chatSpaceId/pin/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = c.env.DB;

  await db.prepare(
    "UPDATE character_memories SET pinned = 0, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
  ).bind(id, userId).run();

  return c.json({ ok: true, pinned: false });
});

app.get("/api/memories/:chatSpaceId/stats", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const chatSpaceId = c.req.param("chatSpaceId");
  const db = c.env.DB;

  const stats = await db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as vectorized,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
    FROM character_memories 
    WHERE user_id = ? AND chat_space_id = ?
  `).bind(userId, chatSpaceId).first();

  return c.json({
    total: stats.total || 0,
    vectorized: stats.vectorized || 0,
    archived: stats.archived || 0,
    vectorizationProgress: stats.total ? (stats.vectorized / stats.total * 100).toFixed(1) : 0,
  });
});

function rowToMemory(row) {
  return {
    id: row.id,
    text: row.text,
    type: row.semantic_type || "event",
    importance: row.importance || 0.5,
    hasEmbedding: !!row.embedding,
    archived: !!row.archived,
    superseded: !!row.superseded,
    pinned: !!row.pinned,
    heat: row.heat || 1.0,
    decayFactor: row.decay_factor || 0.02,
    lastAccessed: row.last_accessed,
    createdAt: row.created_at,
  };
}

// --- 记忆热度计算 ---
function calculateEffectiveHeat(mem) {
  const now = new Date();
  const createdAt = new Date(mem.created_at);
  const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
  const heat = mem.heat || 1.0;
  const decayFactor = mem.decay_factor || 0.02;
  // 热度指数衰减：heat × e^(-decay_factor × 天数)
  let effectiveHeat = heat * Math.exp(-decayFactor * daysSinceCreation);
  // 被访问过的记忆热度回升 10%
  if (mem.last_accessed) {
    const daysSinceAccess = (now - new Date(mem.last_accessed)) / (1000 * 60 * 60 * 24);
    effectiveHeat = effectiveHeat * (1 + 0.1 * Math.exp(-0.05 * daysSinceAccess));
  }
  // 限制在 0 ~ 1.2 之间
  return Math.min(1.2, Math.max(0, effectiveHeat));
}

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

// --- 矛盾检测 ---

const NEGATION_WORDS = ["不", "没", "别", "从不", "绝不", "再也", "永远不", "绝对不"];
function hasNegation(text) { return NEGATION_WORDS.some(w => (text || "").includes(w)); }
function hasNegationFlip(a, b) { return hasNegation(a) !== hasNegation(b); }

async function detectAndMarkContradiction(db, userId, chatSpaceId, newId, newText, newEmbedding) {
  if (!newEmbedding) return;
  const rows = await db.prepare(
    "SELECT id, text, embedding FROM character_memories WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 AND embedding IS NOT NULL ORDER BY created_at DESC LIMIT 30"
  ).bind(userId, chatSpaceId).all();
  if (!rows.results.length) return;

  const newVec = typeof newEmbedding === "string" ? JSON.parse(newEmbedding) : newEmbedding;
  let best = null, bestSim = 0;
  for (const mem of rows.results) {
    const oldVec = typeof mem.embedding === "string" ? JSON.parse(mem.embedding) : mem.embedding;
    if (!oldVec) continue;
    const sim = cosineSimilarity(newVec, oldVec);
    if (sim > 0.75 && sim > bestSim && hasNegationFlip(newText, mem.text)) {
      best = mem; bestSim = sim;
    }
  }
  if (best) {
    await db.prepare(
      "UPDATE character_memories SET superseded = 1, superseded_at = datetime('now'), superseded_by = ? WHERE id = ?"
    ).bind(newId, best.id).run();
  }
}

// --- 向量化辅助函数 ---

async function generateEmbedding(text, env) {
  try {
    if (env.OPENAI_API_KEY) {
      const baseUrl = (env.EMBEDDING_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text.slice(0, 8191),
          model: "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.[0]?.embedding || null;
    }

    if (env.AI) {
      const response = await env.AI.run("@cf/baai/bge-small-en-v1.5", {
        text: text.slice(0, 512),
      });
      return response?.result?.embeddings?.[0] || null;
    }

    return null;
  } catch (err) {
    console.error("向量化错误:", err);
    return null;
  }
}

function encodeEmbedding(vector) {
  if (!Array.isArray(vector)) return null;
  return JSON.stringify(vector);
}

function decodeEmbedding(blob) {
  try {
    if (typeof blob === "string") {
      return JSON.parse(blob);
    }
    return blob;
  } catch {
    return [];
  }
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// --- Chat (backend_gateway) ---

app.post("/api/chat", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const { chatSpaceId, messages, model, systemPrompt, maxTokens, temperature } = body;

  if (!messages?.length) return c.json({ error: "消息不能为空" }, 400);

  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "未配置 API Key" }, 500);
  const baseUrl = (c.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const db = c.env.DB;

  // 搜索相关记忆注入上下文
  let memoryContext = "";
  if (chatSpaceId) {
    try {
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMsg?.content) {
        const vec = await generateEmbedding(lastUserMsg.content.slice(0, 512), c.env);
        if (vec) {
          const rows = await db.prepare(
            "SELECT * FROM character_memories WHERE user_id = ? AND chat_space_id = ? AND archived = 0 AND superseded = 0 AND embedding IS NOT NULL"
          ).bind(userId, chatSpaceId).all();
          const scored = rows.results
            .map(mem => {
              const sim = cosineSimilarity(vec, decodeEmbedding(mem.embedding));
              const heat = calculateEffectiveHeat(mem);
              return { text: mem.text, score: sim * Math.max(0.1, heat), pinned: mem.pinned };
            })
            .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.score - a.score)
            .slice(0, 5);
          // T2: 裁剪每条 ≤40 字 + T4: 去重相似记忆
          const deduped = [];
          for (const mem of scored) {
            if (!deduped.some(d => d.text === mem.text || (d.text.length > 5 && mem.text.includes(d.text.slice(0, 10))))) {
              deduped.push({ ...mem, text: mem.text.length > 40 ? mem.text.slice(0, 40) + "…" : mem.text });
            }
          }
          if (deduped.length) memoryContext = deduped.map(m => m.text).join("\n");
        }
      }
    } catch {}
  }

  // 组装消息发中转站
  const chatMessages = messages.map(m => ({ role: m.role, content: m.content }));
  let finalSystem = systemPrompt || "";
  if (memoryContext) finalSystem = `${finalSystem}\n\n【相关记忆】\n${memoryContext}`.trim();
  if (finalSystem) chatMessages.unshift({ role: "system", content: finalSystem });

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gpt-4o",
        messages: chatMessages,
        max_tokens: maxTokens || 1000,
        temperature: temperature ?? 0.8,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return c.json({ error: `模型请求失败: ${resp.status}`, detail: errText.slice(0, 200) }, 502);
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return c.json({
      ok: true,
      text: reply,
      reasoningContent: data.choices?.[0]?.message?.reasoning_content || "",
      usage: data.usage || {},
      memoryContext: memoryContext || undefined,
    });
  } catch (err) {
    return c.json({ error: `请求异常: ${err.message}` }, 502);
  }
});

// --- Image Generation ---

app.post("/api/images", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { prompt, size, n } = body;
  if (!prompt) return c.json({ error: "prompt 不能为空" }, 400);

  const apiKey = c.env.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "未配置 API Key" }, 500);
  const baseUrl = (c.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  try {
    const resp = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: body.model || "google/gemini-2.5-flash-image",
        n: n || 1,
        size: size || "1024x1024",
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return c.json({ error: `生图失败: ${resp.status}`, detail: errText.slice(0, 200) }, 502);
    }
    const data = await resp.json();
    return c.json({ ok: true, images: data.data || data.images || [] });
  } catch (err) {
    return c.json({ error: `请求异常: ${err.message}` }, 502);
  }
});

// --- Kiwi-Mem Proxy (VPS via serveo) ---

const KIWI_BASE = "http://9519f89675ead802-151-245-90-140.serveousercontent.com/v1";

// OpenAI-compatible /v1/chat/completions → 转发到 kiwi-mem
app.post("/v1/chat/completions", authMiddleware, async (c) => {
  const body = await c.req.json();
  const { messages, model, max_tokens, temperature, stream } = body;
  if (!messages?.length) return c.json({ error: "messages empty" }, 400);

  // 提取 system prompt（kiwi-mem 会自动注入记忆）
  const systemMsg = messages.find(m => m.role === "system");
  const chatMessages = messages.filter(m => m.role !== "system");

  try {
    const resp = await fetch(`${KIWI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "qwen-plus-2025-12-01",
        messages: systemMsg ? [systemMsg, ...chatMessages] : chatMessages,
        max_tokens: max_tokens || 1000,
        temperature: temperature ?? 0.8,
        stream: stream || false,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return c.json({ error: `kiwi-mem: ${resp.status}`, detail: txt.slice(0, 200) }, 502);
    }
    const data = await resp.json();
    return c.json(data);
  } catch (err) {
    return c.json({ error: `kiwi-mem unreachable: ${err.message}` }, 502);
  }
});

// --- Health ---

app.get("/api/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.get("/api/debug/emotion", (c) => {
  const text = c.req.query("text") || "我考上研究生了！！！太开心了";
  const score = estimateImportance(text);
  return c.json({ text, score });
});

export { scheduled } from "./dream.js";

export default app;
