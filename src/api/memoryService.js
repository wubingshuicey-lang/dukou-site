/**
 * memoryService.js
 * 向量记忆系统 — 轻量集成到现有 Chat.jsx 流程
 * - searchRelevantMemories: 向量检索，返回格式化记忆文本
 * - queueMemoryForSaving: 异步累积记忆，阈值触发批量上传
 * - flushPendingMemories: 强制上传
 * - ensureMemoriesSaved: 页面卸载时兜底
 */

import { searchMemories, pushMemories, fetchMemoryStats } from "./apiClient.js";
import { searchSupabaseMemories, saveSupabaseMemory, isSupabaseReady } from "./supabaseClient.js";

const PENDING_KEY_PREFIX = "dukou:pendingMemories";

// --- 记忆检索（注入到 system prompt） ---

export async function searchRelevantMemories(chatSpaceId, query, limit = 5) {
  if (!chatSpaceId || !query) return "";
  try {
    // Try Supabase first (cross-platform sync)
    const supabaseResults = await searchSupabaseMemories(chatSpaceId, query, limit);
    if (supabaseResults.length > 0) {
      return supabaseResults
        .map((m, i) => `${i + 1}. ${m.text}${m.importance ? ` (重要度: ${Math.round(m.importance * 100)}%)` : ""}`)
        .join("\n");
    }
    // Fall back to Worker/D1
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
  // Also save to Supabase directly for cross-platform sync
  saveSupabaseMemory({ chatSpaceId, text, type, importance }).catch(() => {});
  // Keep existing queue + Worker path
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
    if (token) {
      navigator.sendBeacon(
        `https://dukou-api.wubingshuicey.workers.dev/api/memories/${chatSpaceId}`,
        JSON.stringify({ items: pending.map((i) => ({ text: i.text, type: i.type || "event", importance: i.importance || 0.5 })) })
      );
      localStorage.removeItem(key);
    }
  } catch {}
}

export async function getMemoryInfo(chatSpaceId) {
  try { return await fetchMemoryStats(chatSpaceId); } catch { return { total: 0, vectorized: 0 }; }
}
