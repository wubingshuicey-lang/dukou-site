import { getMemorySettings, STORAGE_KEYS } from "./settings.js";

const DEFAULT_LIMIT = 10;
const MAX_RESPONSE_PREVIEW_LENGTH = 300;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function makeId() {
  const randomId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `context-${randomId}`;
}

function redactText(value) {
  return String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer ***")
    .replace(/(sk|rk|ak)-[A-Za-z0-9._~+/=-]{12,}/gi, "$1-***");
}

function sanitizeUsage(usage) {
  if (!usage || typeof usage !== "object") return null;

  return {
    inputTokens: Number(usage.inputTokens || 0),
    outputTokens: Number(usage.outputTokens || 0),
    totalTokens: Number(usage.totalTokens || 0),
    cacheReadTokens: Number(usage.cacheReadTokens || 0),
    cacheWriteTokens: Number(usage.cacheWriteTokens || 0),
  };
}

function sanitizeMemory(memory) {
  return {
    id: String(memory?.id || ""),
    summary: redactText(memory?.summary || ""),
    level2_category: memory?.level2_category || undefined,
    level3_theme: memory?.level3_theme || undefined,
    conversation_date: memory?.conversation_date || undefined,
    weight: typeof memory?.weight === "number" ? memory.weight : undefined,
  };
}

function sanitizeMessage(message) {
  return {
    role: message?.role || "",
    content: redactText(message?.content || ""),
    created_at: message?.created_at || undefined,
  };
}

export function sanitizeContextLog(log) {
  const responsePreview = redactText(log?.responsePreview || "").slice(0, MAX_RESPONSE_PREVIEW_LENGTH);
  const status = ["preview", "success", "error"].includes(log?.status) ? log.status : "preview";

  return {
    id: log?.id || makeId(),
    createdAt: log?.createdAt || new Date().toISOString(),
    trigger: log?.trigger || "manual_preview",
    provider: log?.provider || "",
    model: log?.model || "",
    chatTransport: log?.chatTransport || "",
    chatSpaceId: log?.chatSpaceId || log?.chatSpace || "",
    sessionId: log?.sessionId || undefined,
    systemPrompt: redactText(log?.systemPrompt || ""),
    timeContext: redactText(log?.timeContext || ""),
    memoryBlock: redactText(log?.memoryBlock || ""),
    injectedMemories: Array.isArray(log?.injectedMemories) ? log.injectedMemories.map(sanitizeMemory) : [],
    emotionHint: redactText(log?.emotionHint || ""),
    recentMessages: Array.isArray(log?.recentMessages) ? log.recentMessages.map(sanitizeMessage) : [],
    outputMode: log?.outputMode === "paragraph" ? "paragraph" : "sentence",
    usage: sanitizeUsage(log?.usage),
    responsePreview,
    error: log?.error ? redactText(log.error) : null,
    status,
  };
}

function getLogLimit() {
  const limit = Number(getMemorySettings().contextLogLimit || DEFAULT_LIMIT);
  return Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT;
}

export function getContextLogs() {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.contextLogs);
    const logs = raw ? JSON.parse(raw) : [];
    return Array.isArray(logs) ? logs.map(sanitizeContextLog).slice(0, getLogLimit()) : [];
  } catch {
    return [];
  }
}

function writeContextLogs(logs) {
  if (!canUseLocalStorage()) return;

  const limit = getLogLimit();
  window.localStorage.setItem(STORAGE_KEYS.contextLogs, JSON.stringify(logs.slice(0, limit)));
}

export function saveContextSnapshot(snapshot) {
  try {
    const log = sanitizeContextLog({
      ...snapshot,
      id: snapshot?.id || makeId(),
      createdAt: snapshot?.createdAt || new Date().toISOString(),
    });
    writeContextLogs([log, ...getContextLogs()]);
    return log;
  } catch {
    return null;
  }
}

export function updateContextSnapshot(id, patch) {
  if (!id) return null;

  try {
    const logs = getContextLogs();
    const nextLogs = logs.map((log) => (log.id === id ? sanitizeContextLog({ ...log, ...patch, id: log.id }) : log));
    writeContextLogs(nextLogs);
    return nextLogs.find((log) => log.id === id) || null;
  } catch {
    return null;
  }
}

export function clearContextLogs() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(STORAGE_KEYS.contextLogs);
  }
}
