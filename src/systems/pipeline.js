import { getSessionId } from "../store/session.js";

const LOCAL_ROLLING_HINTS_KEY = "dukou:mockRollingSummaryHints";
const ROLLING_THRESHOLD = 20;

function readLocalHints() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_ROLLING_HINTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalHints(queue) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_ROLLING_HINTS_KEY, JSON.stringify(queue));
  }
}

async function writeLocalRollingHint({ messageCount, sessionId, trigger }) {
  const hints = readLocalHints();
  writeLocalHints([
    ...hints,
    {
      id: `mock-rolling-${Date.now()}`,
      session_id: sessionId || getSessionId(),
      message_count: messageCount,
      trigger,
      created_at: new Date().toISOString(),
    }
  ]);
  return { ok: true, mode: "local_mock" };
}

export async function maybeTriggerRollingSummary(messages, sessionId) {
  if (!Array.isArray(messages) || messages.length <= ROLLING_THRESHOLD) {
    return { ok: true, skipped: true };
  }

  return writeLocalRollingHint({
    messageCount: messages.length,
    sessionId,
    trigger: "rolling_summary",
  });
}

export async function triggerSessionEnd(messages, sessionId) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: true, skipped: true };
  }

  return writeLocalRollingHint({
    messageCount: messages.length,
    sessionId,
    trigger: "session_end",
  });
}
