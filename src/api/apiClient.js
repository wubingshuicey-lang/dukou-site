const API_BASE = "https://dukou-api.wubingshuicey.workers.dev/api";
const TOKEN_KEY = "dukou:apiToken";
const USER_KEY = "dukou:apiUser";

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch {}
}

export function getUser() {
  try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function setUser(user) {
  try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch {}
}

export function isLoggedIn() {
  return !!getToken();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "请求失败");
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("请求超时，请重试");
    throw err;
  }
}

// --- Auth ---

export async function register(username, password) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  setUser(data.user);
  return data;
}

export function logout() {
  clearToken();
}

// --- Settings ---

export async function fetchSettings() {
  return apiFetch("/settings");
}

export async function pushSettings(settings) {
  return apiFetch("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// --- Characters ---

export async function fetchCharacters() {
  return apiFetch("/characters");
}

export async function createCharacter(char) {
  return apiFetch("/characters", {
    method: "POST",
    body: JSON.stringify(char),
  });
}

export async function updateChar(charId, updates) {
  return apiFetch(`/characters/${charId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteChar(charId) {
  return apiFetch(`/characters/${charId}`, { method: "DELETE" });
}

// --- Memories ---

export async function fetchMemories(chatSpaceId, limit = 20) {
  return apiFetch(`/memories/${chatSpaceId}?limit=${limit}`);
}

export async function pushMemories(chatSpaceId, items) {
  return apiFetch(`/memories/${chatSpaceId}`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

// --- Messages ---

export async function fetchMessages(chatSpaceId, limit = 50, before = "") {
  let url = `/messages/${chatSpaceId}?limit=${limit}`;
  if (before) url += `&before=${encodeURIComponent(before)}`;
  return apiFetch(url);
}

export async function pushMessage(message) {
  return apiFetch("/messages", {
    method: "POST",
    body: JSON.stringify(message),
  });
}

export async function updateMsg(msgId, patch) {
  return apiFetch(`/messages/${msgId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}
