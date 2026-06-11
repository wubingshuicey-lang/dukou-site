import { isLoggedIn, fetchCharacters, createCharacter as apiCreateCharacter, updateChar, deleteChar } from "../api/apiClient.js";

const STORAGE_KEY = "dukou:customCharacters";

const DEFAULT_CHARACTERS = [
  {
    id: "char_main",
    name: "机",
    avatarInitial: "机",
    description: "温和的 AI 伴侣，随时倾听",
    chatSpaceId: "char_main",
    status: "accepted",
    isDefault: true,
    modelProvider: "",
    modelApiKey: "",
    modelName: "",
    modelBaseUrl: "",
    voiceId: "",
    ttsEnabled: false,
    sttEnabled: false,
  },
  {
    id: "char_friend",
    name: "小言",
    avatarInitial: "言",
    description: "毒舌但关心人的朋友，说话不留情面",
    chatSpaceId: "char_friend",
    status: "accepted",
    isDefault: true,
    modelProvider: "",
    modelApiKey: "",
    modelName: "",
    modelBaseUrl: "",
    voiceId: "",
    ttsEnabled: false,
    sttEnabled: false,
  },
  {
    id: "char_mentor",
    name: "老陈",
    avatarInitial: "陈",
    description: "退休教授，爱掉书袋但句句在理",
    chatSpaceId: "char_mentor",
    status: "accepted",
    isDefault: true,
    modelProvider: "",
    modelApiKey: "",
    modelName: "",
    modelBaseUrl: "",
    voiceId: "",
    ttsEnabled: false,
    sttEnabled: false,
  },
  {
    id: "char_crush",
    name: "小暖",
    avatarInitial: "暖",
    description: "温柔细腻，偶尔撒娇",
    chatSpaceId: "char_crush",
    status: "accepted",
    isDefault: true,
    modelProvider: "",
    modelApiKey: "",
    modelName: "",
    modelBaseUrl: "",
    voiceId: "",
    ttsEnabled: false,
    sttEnabled: false,
  },
];

// --- Model provider options ---

export const MODEL_PROVIDER_OPTIONS = [
  { id: "", label: "使用全局设置" },
  { id: "zenmux", label: "ZenMux (综合)", baseUrl: "https://zenmux.ai/api/v1", defaultModel: "gpt-4o", apiStyle: "openai_compatible" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: "deepseek-chat", apiStyle: "openai_compatible" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", apiStyle: "openai_compatible" },
  { id: "claude", label: "Claude", baseUrl: "https://api.anthropic.com", defaultModel: "claude-sonnet-4-20250514", apiStyle: "anthropic" },
  { id: "kimi", label: "Kimi (月之暗面)", baseUrl: "https://api.moonshot.ai/v1", defaultModel: "moonshot-v1-8k", apiStyle: "openai_compatible" },
  { id: "glm", label: "GLM (智谱)", baseUrl: "https://open.bigmodel.cn/api/paas/v4", defaultModel: "glm-4-flash", apiStyle: "openai_compatible" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "", apiStyle: "openai_compatible" },
  { id: "custom", label: "自定义接口", baseUrl: "", defaultModel: "", apiStyle: "openai_compatible" },
];

// --- Character creation options (for UI) ---

export const ORIENTATION_OPTIONS = [
  { id: "heterosexual", label: "异性恋" },
  { id: "lesbian", label: "女同", note: "所有描述使用女性化身体、声音、动作" },
  { id: "gay", label: "男同" },
  { id: "bisexual", label: "双性恋" },
  { id: "asexual", label: "无性恋", note: "情感为主，性欲很低" },
  { id: "platonic", label: "柏拉图" },
  { id: "pegging", label: "四爱 pegging" },
  { id: "custom", label: "其他（自定义）" },
];

export const RELATIONSHIP_MODE_OPTIONS = [
  { id: "exclusive", label: "专一恋爱" },
  { id: "secret", label: "地下恋" },
  { id: "open", label: "开放关系" },
  { id: "harem_battle", label: "修罗场" },
  { id: "harem", label: "后宫/逆后宫" },
  { id: "multi_partner", label: "3P/多P", note: "需双方同意且好感极高" },
  { id: "pure_sweet", label: "纯爱甜宠" },
  { id: "yandere", label: "病娇占有" },
  { id: "mutual_crush", label: "双向暗恋" },
  { id: "bickering", label: "欢喜冤家", note: "日常互怼+亲密时很凶" },
  { id: "taboo", label: "师徒/上下级禁忌" },
  { id: "marriage", label: "长期伴侣（结婚线）" },
  { id: "forced", label: "强制爱" },
  { id: "custom_relationship", label: "自定义" },
];

export const KINK_CATEGORIES = {
  basic: {
    label: "基础情感类",
    options: [
      { id: "nickname", label: "称呼癖（专属昵称）" },
      { id: "bite_mark", label: "吻痕/咬痕标记癖" },
      { id: "aftercare", label: "事后照顾play" },
      { id: "voice", label: "耳语情话/声音play" },
      { id: "mirror", label: "镜子play" },
      { id: "hug_from_behind", label: "拥抱固定/后入时抱紧" },
    ],
  },
  gentle: {
    label: "温柔向",
    options: [
      { id: "sleep_sex", label: "哄睡性爱" },
      { id: "bath_play", label: "沐浴play" },
      { id: "morning_night", label: "早安/晚安炮" },
    ],
  },
  intense: {
    label: "激烈向",
    options: [
      { id: "control_loss", label: "克制失控play" },
      { id: "crying", label: "哭泣play" },
      { id: "light_sm", label: "轻度SM" },
      { id: "wall_stand", label: "壁咚/站立后入" },
      { id: "car_public", label: "车震/公共场合" },
      { id: "cosplay_role", label: "角色扮演" },
      { id: "watch_play", label: "观看play" },
    ],
  },
  pegging: {
    label: "四爱 Pegging 专区",
    options: [
      { id: "peg_insert", label: "插入他" },
      { id: "peg_reaction", label: "他被插入反应" },
      { id: "peg_progressive", label: "渐进开发" },
      { id: "peg_costume", label: "制服pegging" },
    ],
  },
  special: {
    label: "特殊向",
    options: [
      { id: "possessive", label: "占有欲强" },
      { id: "collar", label: "项圈/隐形标记" },
      { id: "jealousy_punish", label: "吃醋后惩罚性爱" },
      { id: "breeding", label: "育儿癖/繁衍play" },
      { id: "sensitivity_train", label: "敏感体质开发" },
      { id: "edge_control", label: "延时/边缘控制" },
      { id: "shame", label: "羞耻play" },
      { id: "fluid_play", label: "体液play" },
      { id: "sleep_touch", label: "睡眠play" },
      { id: "tear_mole", label: "泪痣/哭脸癖" },
    ],
  },
  healing: {
    label: "软萌/治愈向",
    options: [
      { id: "morning_kiss", label: "早安吻/晚安吻" },
      { id: "care_sex", label: "照顾型性爱" },
      { id: "aftercare_cuddle", label: "事后照顾" },
    ],
  },
  location: {
    label: "情境/地点类",
    options: [
      { id: "car_backseat", label: "保姆车后排" },
      { id: "practice_room", label: "练习室/待机室偷情" },
      { id: "hotel_balcony", label: "酒店阳台异地play" },
      { id: "dorm_night", label: "合宿宿舍深夜潜入" },
    ],
  },
  roleplay: {
    label: "角色扮演类",
    options: [
      { id: "stage_costume", label: "舞台服play" },
      { id: "uniform", label: "制服play" },
      { id: "fan_taboo", label: "粉丝/练习生禁忌play" },
    ],
  },
  multi: {
    label: "多人向",
    options: [
      { id: "multi_turns", label: "多人轮流" },
      { id: "multi_care", label: "被多人同时照顾" },
      { id: "multi_watch", label: "观看play" },
      { id: "multi_relay_pegging", label: "多人接力+四爱混合" },
    ],
  },
};

// --- CRUD ---

function readCustom() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function writeCustom(custom) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function getAllCharacters() {
  const custom = readCustom();
  const customIds = new Set(custom.map((c) => c.id));
  // Default chars that have been customized are replaced by their custom overrides
  const defaults = DEFAULT_CHARACTERS.filter((d) => !customIds.has(d.id));
  return [...defaults, ...custom];
}

export function getCharacter(id) {
  return getAllCharacters().find((c) => c.id === id) || null;
}

export function getAcceptedCharacters() {
  return getAllCharacters().filter((c) => c.status === "accepted");
}

export function getPendingCharacters() {
  return getAllCharacters().filter((c) => c.status === "pending");
}

export function createCustomCharacter({
  name,
  avatarInitial,
  description,
  personality,
  orientation,
  relationshipModes,
  involvedCharacters,
  kinks,
  pureLoveMode,
  customOrientation,
  customRelationship,
  // Model config
  modelProvider,
  modelApiKey,
  modelName,
  modelBaseUrl,
  // Voice config
  voiceId,
  ttsEnabled,
  sttEnabled,
}) {
  const custom = readCustom();
  const id = "char_custom_" + Date.now();

  const newChar = {
    id,
    name,
    avatarInitial: avatarInitial || name[0],
    description,
    personality: personality || "",
    chatSpaceId: id,
    status: "pending",
    isDefault: false,
    createdAt: new Date().toISOString(),

    orientation: orientation || "heterosexual",
    customOrientation: customOrientation || "",
    relationshipModes: relationshipModes || [],
    customRelationship: customRelationship || "",
    involvedCharacters: involvedCharacters || [],
    kinks: kinks || [],
    pureLoveMode: pureLoveMode || false,

    // Model
    modelProvider: modelProvider || "",
    modelApiKey: modelApiKey || "",
    modelName: modelName || "",
    modelBaseUrl: modelBaseUrl || "",

    // Voice
    voiceId: voiceId || "",
    ttsEnabled: ttsEnabled || false,
    sttEnabled: sttEnabled || false,
  };

  custom.push(newChar);
  writeCustom(custom);

  // background cloud sync
  if (isLoggedIn()) {
    apiCreateCharacter({ ...newChar }).catch(() => {});
  }

  return newChar;
}

export function updateCharacter(charId, updates) {
  const custom = readCustom();
  const idx = custom.findIndex((c) => c.id === charId);
  if (idx !== -1) {
    custom[idx] = { ...custom[idx], ...updates };
    writeCustom(custom);
    if (isLoggedIn()) {
      updateChar(charId, updates).catch(() => {});
    }
    return custom[idx];
  }

  // Handle default characters: promote to a custom entry so edits persist
  const defaultChar = DEFAULT_CHARACTERS.find((c) => c.id === charId);
  if (defaultChar) {
    const entry = { ...defaultChar, ...updates };
    custom.push(entry);
    writeCustom(custom);
    if (isLoggedIn()) {
      updateChar(charId, updates).catch(() => {});
    }
    return entry;
  }

  return null;
}

export function acceptFriendRequest(charId) {
  const custom = readCustom();
  const idx = custom.findIndex((c) => c.id === charId);
  if (idx === -1) return null;
  custom[idx].status = "accepted";
  writeCustom(custom);

  if (isLoggedIn()) {
    updateChar(charId, { status: "accepted" }).catch(() => {});
  }

  return custom[idx];
}

export function deleteCharacter(charId) {
  const custom = readCustom().filter((c) => c.id !== charId);
  writeCustom(custom);

  if (isLoggedIn()) {
    deleteChar(charId).catch(() => {});
  }
}

export async function loadCloudCharacters() {
  if (!isLoggedIn()) return null;
  try {
    const chars = await fetchCharacters();
    if (Array.isArray(chars) && chars.length) {
      const custom = readCustom();
      const merged = [...custom];
      for (const cc of chars) {
        const idx = merged.findIndex(c => c.id === cc.id);
        if (idx >= 0) {
          // Local override wins for settings, but take cloud data as base
          merged[idx] = { ...cc, ...merged[idx] };
        } else {
          merged.push({ ...cc, chatSpaceId: cc.chatSpaceId || cc.id });
        }
      }
      writeCustom(merged);
    }
    return chars;
  } catch {
    return null;
  }
}

/**
 * Build effective model settings for a character.
 * If the character has its own model config, use it.
 * Otherwise, returns null (caller uses global settings).
 */
export function getCharacterModelSettings(charId) {
  const char = getCharacter(charId);
  if (!char || !char.modelProvider) return null;

  const provider = MODEL_PROVIDER_OPTIONS.find((p) => p.id === char.modelProvider);
  if (!provider) return null;

  return {
    provider: char.modelProvider,
    apiStyle: provider.apiStyle,
    apiKey: char.modelApiKey || "",
    baseUrl: char.modelBaseUrl || provider.baseUrl,
    model: char.modelName || provider.defaultModel,
    // Independent image generation settings
    imageModel: char.imageModel || "",
    imageApiKey: char.imageApiKey || "",
    imageBaseUrl: char.imageBaseUrl || "",
    ttsModel: char.ttsModel || "",
  };
}

// --- User-initiated block ---

const BLOCKED_KEY = "dukou:userBlockedChars";

function readBlockedChars() {
  try { return JSON.parse(localStorage.getItem(BLOCKED_KEY) || "[]"); } catch { return []; }
}
function writeBlockedChars(ids) {
  try { localStorage.setItem(BLOCKED_KEY, JSON.stringify(ids)); } catch {}
}

export function isUserBlocked(charId) {
  return readBlockedChars().includes(charId);
}

export function toggleUserBlock(charId) {
  const list = readBlockedChars();
  const idx = list.indexOf(charId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(charId);
  writeBlockedChars(list);
  return idx < 0; // true = now blocked, false = unblocked
}

export function getBlockedCharIds() {
  return readBlockedChars();
}
