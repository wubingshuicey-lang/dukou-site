import { isLoggedIn, fetchMemories, pushMemories } from "../api/apiClient.js";

const STORE_PREFIX = "dukou:memory:";

function readMemories(chatSpaceId) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + chatSpaceId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeMemories(chatSpaceId, memories) {
  localStorage.setItem(STORE_PREFIX + chatSpaceId, JSON.stringify(memories));
}

/** Add a single memory entry. */
export function addMemory(chatSpaceId, text) {
  const memories = readMemories(chatSpaceId);
  memories.push({
    id: `mem-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    text,
    createdAt: new Date().toISOString(),
  });
  writeMemories(chatSpaceId, memories);
  return memories;
}

/** Add multiple memory entries at once. */
export function addMemories(chatSpaceId, items) {
  const memories = readMemories(chatSpaceId);
  const now = new Date().toISOString();
  const newEntries = [];
  items.forEach((text) => {
    const entry = {
      id: `mem-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      text: String(text).trim(),
      createdAt: now,
    };
    newEntries.push(entry);
    memories.push(entry);
  });
  writeMemories(chatSpaceId, memories);

  if (isLoggedIn()) {
    pushMemories(chatSpaceId, newEntries.map(e => e.text)).catch(() => {});
  }

  return memories;
}

/** Get the most recent N memories for a character. */
export function getRecentMemories(chatSpaceId, limit = 10) {
  const memories = readMemories(chatSpaceId);
  return memories.slice(-limit);
}

/** Get count of memories for a character. */
export function getMemoryCount(chatSpaceId) {
  return readMemories(chatSpaceId).length;
}

/** Clear all memories for a character. */
export function clearMemories(chatSpaceId) {
  localStorage.removeItem(STORE_PREFIX + chatSpaceId);
  localStorage.removeItem(STORE_PREFIX + chatSpaceId + ":ltm");
}

// ── Long-term memory (summarized, persisted) ──

export function getLongTermMemory(chatSpaceId) {
  try {
    return localStorage.getItem(STORE_PREFIX + chatSpaceId + ":ltm") || "";
  } catch { return ""; }
}

export function setLongTermMemory(chatSpaceId, text) {
  try {
    localStorage.setItem(STORE_PREFIX + chatSpaceId + ":ltm", String(text).trim());
  } catch {}
}
