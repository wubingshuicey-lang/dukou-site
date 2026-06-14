import { isLoggedIn, fetchSettings, pushSettings } from "../api/apiClient.js";

const LEGACY_SETTINGS_KEY = "dukou:settings";

export const STORAGE_KEYS = {
  modelSettings: "dukou:modelSettings",
  uiSettings: "dukou:uiSettings",
  memorySettings: "dukou:memorySettings",
  transportSettings: "dukou:transportSettings",
  promptSettings: "dukou:promptSettings",
  elevenlabsSettings: "dukou:elevenlabsSettings",
  contextLogs: "dukou:contextLogs",
  localUserId: "dukou:localUserId",
};

export const PROVIDER_PRESETS = {
  zenmux: {
    label: "ZenMux",
    apiStyle: "openai_compatible",
    baseUrl: "https://zenmux.ai/api/v1",
    defaultModel: "gpt-4o",
  },
  deepseek: {
    label: "DeepSeek",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
  },
  kimi: {
    label: "Kimi",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "",
  },
  glm: {
    label: "GLM",
    apiStyle: "openai_compatible",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "",
  },
  openai: {
    label: "OpenAI",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "",
  },
  openrouter: {
    label: "OpenRouter",
    apiStyle: "openai_compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "",
  },
  claude: {
    label: "Claude",
    apiStyle: "anthropic",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "",
  },
  kiwi_local: {
    label: "Kiwi Local",
    apiStyle: "openai_compatible",
    baseUrl: "https://dukou-api.wubingshuicey.workers.dev/v1",
    defaultModel: "qwen-plus-2025-12-01",
  },
  custom_openai_compatible: {
    label: "Custom",
    apiStyle: "openai_compatible",
    baseUrl: "",
    defaultModel: "",
  },
};

export const DEFAULT_MODEL_SETTINGS = {
  provider: "deepseek",
  apiStyle: "openai_compatible",
  apiKey: "",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  // Per-capability model overrides: if empty, falls back to `model`
  chatModel: "",
  imageModel: "google/gemini-2.5-flash-image",
  imageProvider: "",
  imageApiKey: "",
  imageBaseUrl: "",
  sttModel: "whisper-1",
  ttsModel: "tts-1",
  temperature: 0.8,
  maxTokens: 1000,
  outputMode: "sentence",
};

export const DEFAULT_MEMORY_SETTINGS = {
  memoryMode: "mock",
  injectedMemoryLimit: 8,
  recentMessageLimit: 20,
  saveContextLogs: true,
  contextLogLimit: 10,
};

export const DEFAULT_TRANSPORT_SETTINGS = {
  chatTransport: "mock",
};

export const DEFAULT_PROMPT_SETTINGS = {
  mode: "default",
  customSystemPrompt: "",
};

export const DEFAULT_ELEVENLABS_SETTINGS = {
  provider: "elevenlabs", // "elevenlabs" | "openai"
  apiKey: "",
  voiceId: "",
  autoPlay: false,
  stability: 0.5,
  similarityBoost: 0.75,
  openaiModel: "tts-1", // for OpenAI TTS: tts-1 or tts-1-hd
  speed: 1.0,
};

export const DEFAULT_UI_SETTINGS = {
  theme: "light",
  duName: "机",
  userName: "我",
  duAvatarImage: "",
  userAvatarImage: "",
  duAvatarOpacity: 1,
  userAvatarOpacity: 1,
  chatBackgroundImage: "",
  chatBackgroundOpacity: 0.22,
  chatBackgroundBlur: 0,
  chatHeaderColor: "#f4f1eb",
  chatHeaderOpacity: 1,
  chatHeaderBlur: 0,
  chatInputColor: "#ffffff",
  chatInputOpacity: 1,
  chatInputBlur: 0,
  duBubbleColor: "",
  userBubbleColor: "",
  chatBubbleOpacity: 1,
  chatBubbleBlur: 0,
};

export const DEFAULT_SETTINGS = {
  model: DEFAULT_MODEL_SETTINGS,
  memory: DEFAULT_MEMORY_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  transport: DEFAULT_TRANSPORT_SETTINGS,
  prompt: DEFAULT_PROMPT_SETTINGS,
  elevenlabs: DEFAULT_ELEVENLABS_SETTINGS,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson(key) {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function removeItem(key) {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
  }
}

function mergeModelSettings(value) {
  const merged = {
    ...DEFAULT_MODEL_SETTINGS,
    ...(value || {}),
  };

  if (!PROVIDER_PRESETS[merged.provider]) {
    merged.provider = DEFAULT_MODEL_SETTINGS.provider;
  }

  if (merged.provider === "kiwi_local") {
    merged.apiStyle = "openai_compatible";
    merged.baseUrl = merged.baseUrl || PROVIDER_PRESETS.kiwi_local.baseUrl;
    merged.model = merged.model || PROVIDER_PRESETS.kiwi_local.defaultModel;
    merged.apiKey = "";
  }

  // api_format 白名单校验（13: XSS 防御）
  const ALLOWED_API_FORMATS = ["openai", "anthropic", "openai_compatible"];
  if (merged.apiStyle && !ALLOWED_API_FORMATS.includes(merged.apiStyle)) {
    merged.apiStyle = "openai_compatible";
  }

  return merged;
}

function mergeMemorySettings(value) {
  const merged = {
    ...DEFAULT_MEMORY_SETTINGS,
    ...(value || {}),
  };

  merged.memoryMode = value?.memoryMode || value?.mode || merged.memoryMode;
  if (!["mock", "kiwi_managed"].includes(merged.memoryMode)) {
    merged.memoryMode = "mock";
  }
  delete merged.mode;
  delete merged.chatTransport;
  return merged;
}

function mergeTransportSettings(value, legacyMemory = {}) {
  const merged = {
    ...DEFAULT_TRANSPORT_SETTINGS,
    ...(value || {}),
  };

  merged.chatTransport = value?.chatTransport || legacyMemory?.chatTransport || value?.mode || merged.chatTransport;
  if (!["mock", "direct_model", "kiwi_direct", "backend_gateway"].includes(merged.chatTransport)) {
    merged.chatTransport = "mock";
  }
  delete merged.mode;
  return merged;
}

function mergePromptSettings(value) {
  const merged = {
    ...DEFAULT_PROMPT_SETTINGS,
    ...(value || {}),
  };

  if (merged.mode !== "custom") {
    merged.mode = "default";
    merged.customSystemPrompt = "";
  }

  return merged;
}

function sanitizeDisplayName(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 8) : fallback;
}

function sanitizeImageValue(value) {
  const text = String(value || "");
  return text.startsWith("data:image/") ? text : "";
}

function sanitizeOpacity(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function sanitizeBlur(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(18, Math.max(0, number));
}

function sanitizeGlassBlur(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(24, Math.max(0, number));
}

function sanitizeColor(value, fallback) {
  const text = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text.toLowerCase() : fallback;
}

function mergeUiSettings(value) {
  const ui = {
    ...DEFAULT_UI_SETTINGS,
    ...(value || {}),
  };

  ui.theme = ui.theme === "dark" ? "dark" : "light";
  ui.duName = sanitizeDisplayName(ui.duName, DEFAULT_UI_SETTINGS.duName);
  ui.userName = sanitizeDisplayName(ui.userName, DEFAULT_UI_SETTINGS.userName);
  ui.duAvatarImage = sanitizeImageValue(ui.duAvatarImage);
  ui.userAvatarImage = sanitizeImageValue(ui.userAvatarImage);
  ui.duAvatarOpacity = sanitizeOpacity(ui.duAvatarOpacity, DEFAULT_UI_SETTINGS.duAvatarOpacity);
  ui.userAvatarOpacity = sanitizeOpacity(ui.userAvatarOpacity, DEFAULT_UI_SETTINGS.userAvatarOpacity);
  ui.chatBackgroundImage = sanitizeImageValue(ui.chatBackgroundImage);
  ui.chatBackgroundOpacity = sanitizeOpacity(ui.chatBackgroundOpacity, DEFAULT_UI_SETTINGS.chatBackgroundOpacity);
  ui.chatBackgroundBlur = sanitizeBlur(ui.chatBackgroundBlur, DEFAULT_UI_SETTINGS.chatBackgroundBlur);
  ui.chatHeaderColor = sanitizeColor(ui.chatHeaderColor, DEFAULT_UI_SETTINGS.chatHeaderColor);
  ui.chatHeaderOpacity = sanitizeOpacity(ui.chatHeaderOpacity, DEFAULT_UI_SETTINGS.chatHeaderOpacity);
  ui.chatHeaderBlur = sanitizeGlassBlur(ui.chatHeaderBlur, DEFAULT_UI_SETTINGS.chatHeaderBlur);
  ui.chatInputColor = sanitizeColor(ui.chatInputColor, DEFAULT_UI_SETTINGS.chatInputColor);
  ui.chatInputOpacity = sanitizeOpacity(ui.chatInputOpacity, DEFAULT_UI_SETTINGS.chatInputOpacity);
  ui.chatInputBlur = sanitizeGlassBlur(ui.chatInputBlur, DEFAULT_UI_SETTINGS.chatInputBlur);
  ui.duBubbleColor = sanitizeColor(ui.duBubbleColor, DEFAULT_UI_SETTINGS.duBubbleColor);
  ui.userBubbleColor = sanitizeColor(ui.userBubbleColor, DEFAULT_UI_SETTINGS.userBubbleColor);
  ui.chatBubbleOpacity = sanitizeOpacity(ui.chatBubbleOpacity, DEFAULT_UI_SETTINGS.chatBubbleOpacity);
  ui.chatBubbleBlur = sanitizeGlassBlur(ui.chatBubbleBlur, DEFAULT_UI_SETTINGS.chatBubbleBlur);
  delete ui.duAvatarPreset;
  delete ui.userAvatarPreset;
  delete ui.chatBackground;

  return ui;
}

function mergeElevenlabsSettings(value) {
  return {
    ...DEFAULT_ELEVENLABS_SETTINGS,
    ...(value || {}),
  };
}

function mergeSettings(value) {
  return {
    model: mergeModelSettings(value?.model),
    memory: mergeMemorySettings(value?.memory),
    transport: mergeTransportSettings(value?.transport, value?.memory),
    ui: mergeUiSettings(value?.ui),
    prompt: mergePromptSettings(value?.prompt),
    elevenlabs: mergeElevenlabsSettings(value?.elevenlabs),
  };
}

export function applyUiSettings(uiSettings = getSettings().ui) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = uiSettings.theme === "dark" ? "dark" : "light";
}

function persistSplitSettings(settings) {
  writeJson(STORAGE_KEYS.modelSettings, settings.model);
  writeJson(STORAGE_KEYS.memorySettings, settings.memory);
  writeJson(STORAGE_KEYS.transportSettings, settings.transport);
  writeJson(STORAGE_KEYS.uiSettings, settings.ui);
  writeJson(STORAGE_KEYS.promptSettings, settings.prompt);
  writeJson(STORAGE_KEYS.elevenlabsSettings, settings.elevenlabs);
  removeItem(LEGACY_SETTINGS_KEY);
}

export function getSettings() {
  if (!canUseLocalStorage()) return mergeSettings();

  const legacy = readJson(LEGACY_SETTINGS_KEY);
  const split = {
    model: readJson(STORAGE_KEYS.modelSettings),
    memory: readJson(STORAGE_KEYS.memorySettings),
    transport: readJson(STORAGE_KEYS.transportSettings),
    ui: readJson(STORAGE_KEYS.uiSettings),
    prompt: readJson(STORAGE_KEYS.promptSettings),
    elevenlabs: readJson(STORAGE_KEYS.elevenlabsSettings),
  };
  const hasSplitSettings = Object.values(split).some(Boolean);

  if (legacy && !hasSplitSettings) {
    const migrated = mergeSettings(legacy);
    persistSplitSettings(migrated);
    return migrated;
  }

  if (legacy && hasSplitSettings) {
    removeItem(LEGACY_SETTINGS_KEY);
  }

  return mergeSettings(split);
}

export function saveSettings(settings) {
  const next = mergeSettings(settings);
  persistSplitSettings(next);
  applyUiSettings(next.ui);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dukou:settings-changed"));
  }

  // background cloud sync
  if (isLoggedIn()) {
    const payload = {};
    for (const [key, storeKey] of [
      ["model", STORAGE_KEYS.modelSettings],
      ["memory", STORAGE_KEYS.memorySettings],
      ["transport", STORAGE_KEYS.transportSettings],
      ["ui", STORAGE_KEYS.uiSettings],
      ["prompt", STORAGE_KEYS.promptSettings],
      ["elevenlabs", STORAGE_KEYS.elevenlabsSettings],
    ]) {
      if (next[key]) payload[storeKey] = next[key];
    }
    pushSettings(payload).catch(() => {});
  }

  return next;
}

export async function loadCloudSettings() {
  if (!isLoggedIn()) return null;
  try {
    const cloud = await fetchSettings();
    if (!cloud || !Object.keys(cloud).length) return null;

    // Merge cloud settings into local storage (cloud takes precedence over defaults,
    // but existing local settings override cloud — user's current device wins)
    const local = getSettings();
    const merged = mergeSettings({
      model: cloud[STORAGE_KEYS.modelSettings] || local.model,
      memory: cloud[STORAGE_KEYS.memorySettings] || local.memory,
      transport: cloud[STORAGE_KEYS.transportSettings] || local.transport,
      ui: cloud[STORAGE_KEYS.uiSettings] || local.ui,
      prompt: cloud[STORAGE_KEYS.promptSettings] || local.prompt,
      elevenlabs: cloud[STORAGE_KEYS.elevenlabsSettings] || local.elevenlabs,
    });
    persistSplitSettings(merged);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dukou:settings-changed"));
    }
    return merged;
  } catch {
    return null;
  }
}

export function getModelSettings() {
  return getSettings().model;
}

export function getMemorySettings() {
  return getSettings().memory;
}

export function getTransportSettings() {
  return getSettings().transport;
}

export function getPromptSettings() {
  return getSettings().prompt;
}

export function clearModelApiKey() {
  const current = getSettings();
  return saveSettings({
    ...current,
    model: {
      ...current.model,
      apiKey: "",
    },
  });
}

export function getElevenlabsSettings() {
  return getSettings().elevenlabs;
}

export function clearLocalSecrets() {
  const current = getSettings();
  return saveSettings({
    ...current,
    model: {
      ...current.model,
      apiKey: "",
    },
  });
}
