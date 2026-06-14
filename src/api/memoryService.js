/**
 * memoryService.js
 * 向量记忆系统 — 轻量集成到现有 Chat.jsx 流程
 * - searchRelevantMemories: 向量检索，返回格式化记忆文本
 * - queueMemoryForSaving: 异步累积记忆，阈值触发批量上传
 * - flushPendingMemories: 强制上传
 * - ensureMemoriesSaved: 页面卸载时兜底
 */

import { searchMemories, pushMemories, fetchMemoryStats } from "./apiClient.js";

const PENDING_KEY_PREFIX = "dukou:pendingMemories";

// --- 记忆检索（注入到 system prompt） ---

export async function searchRelevantMemories(chatSpaceId, query, limit = 5) {
  if (!chatSpaceId || !query) return "";
  try {
    // 直接走 Worker/D1（有 embedding），不走 Supabase（无 embedding，白白浪费一次请求）
    const result = await searchMemories(chatSpaceId, query, limit);
    const list = result?.results || result || [];
    if (!Array.isArray(list) || list.length === 0) return "";
    return list
      .map((m, i) => `${i + 1}. ${m.text}${m.importance ? ` (重要度: ${Math.round(m.importance * 100)}%)` : ""}`)
      .join("\n");
  } catch {
    return "";
  }
}

// --- 累积 + 批量上传 ---

export function queueMemoryForSaving(chatSpaceId, text, type = "event", importance = 0.3) {
  const key = `${PENDING_KEY_PREFIX}:${chatSpaceId}`;
  try {
    const pending = JSON.parse(localStorage.getItem(key) || "[]");
    pending.push({ text, type, importance, timestamp: Date.now() });
    if (pending.length >= 3) {
      flushPendingMemories(chatSpaceId).catch(() => {});
    } else {
      localStorage.setItem(key, JSON.stringify(pending));
    }
  } catch {}
}

export async function flushPendingMemories(chatSpaceId) {
  const key = `${PENDING_KEY_PREFIX}:${chatSpaceId}`;
  try {
    const pending = JSON.parse(localStorage.getItem(key) || "[]");
    if (!pending.length) return { ok: true, count: 0 };
    await pushMemories(chatSpaceId, pending.map((i) => ({
      text: i.text, type: i.type || "event", importance: i.importance || 0.5,
    })));
    localStorage.removeItem(key);
    return { ok: true, count: pending.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function ensureMemoriesSaved(chatSpaceId) {
  const key = `${PENDING_KEY_PREFIX}:${chatSpaceId}`;
  try {
    const pending = JSON.parse(localStorage.getItem(key) || "[]");
    if (!pending.length) return;
    const token = localStorage.getItem("dukou:apiToken");
    if (!token) return;
    const body = JSON.stringify({
      items: pending.map((i) => ({
        text: i.text,
        type: i.type || "event",
        importance: i.importance || 0.5,
      })),
    });
    // 优先 fetch+keepalive（有返回值，失败不删 pending）
    const apiBase = "https://dukou-api.wubingshuicey.workers.dev/api";
    fetch(`${apiBase}/memories/${chatSpaceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body,
      keepalive: true,
    })
      .then((res) => { if (res.ok) localStorage.removeItem(key); })
      .catch(() => {
        // fetch 失败，降级 sendBeacon（不删 key，下次重试）
        navigator.sendBeacon(`${apiBase}/memories/${chatSpaceId}`, body);
      });
  } catch {}
}

export async function getMemoryInfo(chatSpaceId) {
  try { return await fetchMemoryStats(chatSpaceId); } catch { return { total: 0, vectorized: 0 }; }
}
