const LOCAL_USER_KEY = "dukou:localUserId";
const SESSION_KEY = "dukou:sessionId";

function makeId(prefix) {
  const randomId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`;
}

function getOrCreate(key, prefix) {
  if (typeof window === "undefined") return makeId(prefix);

  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = makeId(prefix);
  window.localStorage.setItem(key, next);
  return next;
}

export function getLocalUserId() {
  return getOrCreate(LOCAL_USER_KEY, "local-user");
}

export function getSessionId() {
  return getOrCreate(SESSION_KEY, "session");
}

export function startNewSession() {
  const next = makeId("session");
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, next);
  }
  return next;
}
