import { useEffect, useRef, useState } from "react";
import Bubble from "../components/Bubble.jsx";
import CharacterModelSettings from "../components/CharacterModelSettings.jsx";
import ChatHistoryOverlay from "../components/ChatHistoryOverlay.jsx";
import MemoryDrawer from "../components/MemoryDrawer.jsx";
import MessageInput from "../components/MessageInput.jsx";
import StatusBanner from "../components/StatusBanner.jsx";
import TokenPanel from "../components/TokenPanel.jsx";
import TypingDots from "../components/TypingDots.jsx";
import emotionAngrySrc from "../assets/emotion-angry.svg";
import emotionCalmSrc from "../assets/emotion-calm.svg";
import emotionHappySrc from "../assets/emotion-happy.svg";
import emotionSadSrc from "../assets/emotion-sad.svg";
import { getEmotionState, getInjectedMemories } from "../api/memory.js";
import { getRecentMessages, insertMessage, markDuMessagesRead, markUserMessagesRead, updateMessageRecord } from "../api/messages.js";
import { loadCloudMessages } from "../api/messageArchive.js";
import { sendChatRequest } from "../api/chatTransport.js";
import { callModel, normalizeModelError } from "../api/modelClient.js";
import { generateImage } from "../api/providers/imageGeneration.js";
import { getMemorySettings, getModelSettings, getPromptSettings, getSettings, getTransportSettings } from "../store/settings.js";
import { addMemories, getRecentMemories } from "../store/characterMemory.js";
import { searchMemories } from "../systems/memorySearch.js";
import { saveContextSnapshot, updateContextSnapshot } from "../store/contextLogs.js";
import { getSessionId } from "../store/session.js";
import { buildContextPreview } from "../systems/context.js";
import { maybeTriggerRollingSummary } from "../systems/pipeline.js";
import { fallbackReplyFor, parseSpecialActions, splitToMessages, stripSpecialTags } from "../systems/specialActions.js";

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const QUOTE_CONTEXT_LIMIT = 80;
const CHAT_AFFORDANCE_STATE_KEY = "dukou:chatAffordanceState";
const KEEPSAKE_DRAFTS_KEY = "dukou:conversationKeepsakes";
const EMOTION_AWARENESS_WINDOW_MS = 30 * 60 * 1000;
const CHAT_SPACE_STATE_KEY = "dukou:activeChatSpace";
const CHAT_SESSION_STATE_KEY = "dukou:chatSessionState";
const BLOCKED_NOTES_KEY = "dukou:blockedNotes";
const AUTO_KEEPTRIGGERS = ["这段对话我想收藏起来", "收藏这段对话", "把这段对话收藏起来", "把刚才那段收起来"];
const CHAT_SPACES = [
  {
    id: "main",
    label: "我们",
    eyebrow: "主线",
    detail: "保留当前聊天，不混入测试和临时内容。",
  },
  {
    id: "model_test",
    label: "模型测试",
    eyebrow: "试跑",
    detail: "独立测试语气，不读取主线 recentMessages。",
  },
  {
    id: "incognito",
    label: "无痕聊天",
    eyebrow: "临时",
    detail: "只留在当前前端运行态，切走即清空。",
  },
];
const CHAT_STATUS_VALUES = ["idle", "waiting_model", "typing", "failed", "away", "ended", "blocked"];
const BLOCKED_NOTE_REPLY_LIMIT = 30;
const BLOCKED_UNBLOCK_FALLBACK = "我回来了。";
const EMOTION_ICON_BY_MOOD = {
  happy: emotionHappySrc,
  sad: emotionSadSrc,
  angry: emotionAngrySrc,
  calm: emotionCalmSrc,
};
const EMOTION_DAY_TICKS = [
  { time: "00:00", hour: 0 },
  { time: "04:00", hour: 4 },
  { time: "08:00", hour: 8 },
  { time: "12:00", hour: 12 },
  { time: "16:00", hour: 16 },
  { time: "20:00", hour: 20 },
  { time: "24:00", hour: 24 },
];
const EMOTION_DAY_POINTS = [
  { time: "00:00", hour: 0, mood: "calm", label: "平静", value: 46 },
  { time: "03:00", hour: 3, mood: "sad", label: "很轻", value: 34 },
  { time: "06:00", hour: 6, mood: "calm", label: "醒来", value: 44 },
  { time: "09:00", hour: 9, mood: "happy", label: "松弛", value: 66 },
  { time: "12:00", hour: 12, mood: "happy", label: "明亮", value: 72 },
  { time: "15:00", hour: 15, mood: "angry", label: "有点紧", value: 42 },
  { time: "18:00", hour: 18, mood: "sad", label: "低一点", value: 32 },
  { time: "21:00", hour: 21, mood: "calm", label: "回稳", value: 58 },
  { time: "24:00", hour: 24, mood: "calm", label: "安静", value: 52 },
];
const DEFAULT_DISPLAY_NAMES = { assistant: "机", user: "我" };

function normalizeDisplayName(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 8) : fallback;
}

function getDisplayNames(uiSettings = {}) {
  return {
    assistant: normalizeDisplayName(uiSettings.duName, DEFAULT_DISPLAY_NAMES.assistant),
    user: normalizeDisplayName(uiSettings.userName, DEFAULT_DISPLAY_NAMES.user),
  };
}

function getAvatarInitial(name, fallback = "机") {
  return String(name || "").trim().slice(0, 1) || fallback;
}

function getAvatarClassName(role, baseClassName = "du-avatar") {
  return `${baseClassName} is-${role}`;
}

function getUiOpacity(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function getUiBlur(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(24, Math.max(0, number));
}

function getDefaultBubbleColor(theme, role) {
  if (role === "user") return theme === "dark" ? "#33424d" : "#7b8fa1";
  return theme === "dark" ? "#272a30" : "#ffffff";
}

function hexToRgba(value, opacity = 1) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? String(value) : "#ffffff";
  const color = Number.parseInt(hex.slice(1), 16);
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  return `rgba(${red}, ${green}, ${blue}, ${getUiOpacity(opacity, 1)})`;
}

function AvatarImageContent({ image, name, opacity }) {
  if (image) {
    return <img src={image} alt="" style={{ opacity }} />;
  }

  return getAvatarInitial(name);
}

function getChatRootStyle(uiSettings = {}) {
  const hasBackgroundImage = Boolean(uiSettings.chatBackgroundImage);
  const bubbleOpacity = getUiOpacity(uiSettings.chatBubbleOpacity, 1);
  const duBubbleColor = uiSettings.duBubbleColor || getDefaultBubbleColor(uiSettings.theme, "du");
  const userBubbleColor = uiSettings.userBubbleColor || getDefaultBubbleColor(uiSettings.theme, "user");
  return {
    "--chat-background-image": hasBackgroundImage ? `url("${uiSettings.chatBackgroundImage}")` : "none",
    "--chat-background-opacity": hasBackgroundImage ? String(getUiOpacity(uiSettings.chatBackgroundOpacity, 0.22)) : "0",
    "--chat-background-blur": `${Math.min(18, Math.max(0, Number(uiSettings.chatBackgroundBlur) || 0))}px`,
    "--chat-header-bg": hexToRgba(uiSettings.chatHeaderColor, uiSettings.chatHeaderOpacity),
    "--chat-header-blur": `${getUiBlur(uiSettings.chatHeaderBlur)}px`,
    "--chat-input-bg": hexToRgba(uiSettings.chatInputColor, uiSettings.chatInputOpacity),
    "--chat-input-blur": `${getUiBlur(uiSettings.chatInputBlur)}px`,
    "--chat-bubble-du-bg": hexToRgba(duBubbleColor, bubbleOpacity),
    "--chat-bubble-user-bg": hexToRgba(userBubbleColor, bubbleOpacity),
    "--chat-bubble-blur": getUiBlur(uiSettings.chatBubbleBlur) + "px",
  };
}

function truncateText(text, limit) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
}

function readJsonStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function normalizeChatSpaceId(value) {
  return CHAT_SPACES.some((space) => space.id === value) ? value : "main";
}

function getChatSpaceMeta(id) {
  return CHAT_SPACES.find((space) => space.id === id) || CHAT_SPACES[0];
}

function isPersistedChatSpace(id) {
  return id !== "incognito";
}

function readActiveChatSpace() {
  if (typeof window === "undefined") return "main";
  return normalizeChatSpaceId(window.localStorage.getItem(CHAT_SPACE_STATE_KEY));
}

function writeActiveChatSpace(id) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CHAT_SPACE_STATE_KEY, normalizeChatSpaceId(id));
  }
}

function normalizeChatStatus(value) {
  return CHAT_STATUS_VALUES.includes(value) ? value : "idle";
}

function readChatSessionState() {
  return readJsonStorage(CHAT_SESSION_STATE_KEY, { main: "idle", model_test: "idle" });
}

function writeChatSessionStatus(chatSpaceId, status) {
  if (!isPersistedChatSpace(chatSpaceId)) return;
  const current = readChatSessionState();
  writeJsonStorage(CHAT_SESSION_STATE_KEY, {
    ...current,
    [chatSpaceId]: normalizeChatStatus(status),
  });
}

function readChatStatus(chatSpaceId) {
  if (!isPersistedChatSpace(chatSpaceId)) return "idle";
  return normalizeChatStatus(readChatSessionState()[chatSpaceId]);
}

function readBlockedNotes(chatSpaceId) {
  const records = readJsonStorage(BLOCKED_NOTES_KEY, {});
  const notes = records?.[chatSpaceId];
  return Array.isArray(notes) ? notes : [];
}

function writeBlockedNotes(chatSpaceId, notes) {
  const records = readJsonStorage(BLOCKED_NOTES_KEY, {});
  writeJsonStorage(BLOCKED_NOTES_KEY, {
    ...records,
    [chatSpaceId]: notes,
  });
}

function isTerminalChatStatus(status) {
  return ["away", "ended", "blocked"].includes(status);
}

function getHeaderStatusText({ typing, isSending, status, assistantName = "机" }) {
  if (typing) return "正在输入";
  if (isSending || status === "waiting_model") return `${assistantName}在想`;
  if (status === "away") return `${assistantName}暂时离开了`;
  if (status === "ended") return "已离开";
  if (status === "blocked") return "已拉黑";
  if (status === "failed") return "刚才断了一下";
  return "在线";
}

function getInputDisabledLabel({ typing, isSending, status, assistantName = "机" }) {
  if (typing) return "正在输入...";
  if (isSending || status === "waiting_model") return `${assistantName}在想...`;
  if (status === "ended") return `${assistantName}已经离开这次对话`;
  if (status === "blocked") return "被拉黑后只能写小纸条";
  if (status === "away") return `${assistantName}暂时离开了`;
  return "先等一下";
}

function getSpaceMemorySettings(memorySettings, chatSpaceId) {
  if (chatSpaceId === "main") return memorySettings;
  return {
    ...memorySettings,
    memoryMode: "kiwi_managed",
    injectedMemoryLimit: 0,
  };
}

function getSpaceTransportSettings(transportSettings, chatSpaceId) {
  const chatTransport = transportSettings?.chatTransport || "mock";
  if (chatSpaceId === "main" || chatSpaceId.startsWith("char_")) return transportSettings;
  if (chatSpaceId === "model_test") {
    return {
      ...transportSettings,
      chatTransport: chatTransport === "mock" ? "mock" : "direct_model",
    };
  }
  return {
    ...transportSettings,
    chatTransport: chatTransport === "direct_model" ? "direct_model" : "mock",
  };
}

function getMockTextForSpace({ chatSpaceId, userText, opening, blockedNote = false }) {
  if (opening) return "来了。<split>你还在赶AI 陪伴前端，我记得。";
  if (chatSpaceId === "model_test") return "模型试跑收到。<split>这句只留在测试窗口。";
  if (chatSpaceId === "incognito") return "这句只留在这里。<split>不会进主线。";
  if (blockedNote && /解除|回来|别拉黑|不拉黑/.test(userText)) return "我看到了。<unblock_user>";
  if (blockedNote) return "我看到了。";
  return fallbackReplyFor(userText);
}

function clampTextByCharacters(text, limit) {
  const chars = Array.from(String(text || "").trim());
  if (chars.length <= limit) return chars.join("");
  return chars.slice(0, limit - 1).join("") + "…";
}

function mergeMessageParts(parts, fallback = "") {
  const text = (Array.isArray(parts) ? parts : [])
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function buildBlockedNoteReplyParts(parts) {
  const text = mergeMessageParts(parts);
  return text ? [clampTextByCharacters(text, BLOCKED_NOTE_REPLY_LIMIT)] : [];
}

function buildBlockedUnblockReplyParts(parts) {
  return [mergeMessageParts(parts, BLOCKED_UNBLOCK_FALLBACK)];
}

function isBlockedNoteMessage(message) {
  const source = message?.meta?.source || "";
  return message?.status === "blocked_note" || source === "blocked_note" || source === "blocked_note_reply";
}

function getVisibleMessages(messages) {
  return messages.filter(
    (message) =>
      message.content &&
      !message.excludedFromContext &&
      message.status !== "deleted" &&
      message.status !== "superseded"
  );
}

function isLocalBlockedMessage(message) {
  const source = message?.meta?.source || "";
  return message?.status === "blocked_failed" || source === "blocked_failed" || isBlockedNoteMessage(message);
}

function getModelContextMessages(messages) {
  return getVisibleMessages(messages);
}

function getResponseGroupId(message) {
  return message.responseGroupId || message.meta?.responseGroupId || "";
}

function createResponseGroupId(chatSpaceId) {
  return `reply-${chatSpaceId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readChatAffordanceState() {
  return readJsonStorage(CHAT_AFFORDANCE_STATE_KEY, {
    emotionViewedAt: "",
    emotionChangedAt: "",
    currentEmotionSignature: "",
    lastEmotionSignature: "",
  });
}

function writeChatAffordanceState(nextState) {
  writeJsonStorage(CHAT_AFFORDANCE_STATE_KEY, nextState);
}

function isRecentIsoTime(value, windowMs) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < windowMs;
}

function getEmotionSignature(emotion) {
  const valence = Number(emotion?.valence ?? 0.5).toFixed(2);
  const arousal = Number(emotion?.arousal ?? 0.45).toFixed(2);
  return `${valence}:${arousal}:${emotion?.last_note || ""}`;
}

function hasUnreadEmotionChange(state) {
  if (!state.emotionChangedAt) return false;
  if (!state.emotionViewedAt) return true;
  return new Date(state.emotionChangedAt).getTime() > new Date(state.emotionViewedAt).getTime();
}

function formatShortDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKeepsakeDate(value) {
  if (!value) return "未定日期";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getKeepsakeDateParts(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { year: "----", day: "--.--" };
  }
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return { year, day: `${month}.${day}` };
}

function formatKeepsakeTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEmotionDisplay(emotion) {
  const valence = Number(emotion?.valence ?? 0.5);
  const arousal = Number(emotion?.arousal ?? 0.45);
  const mood = valence >= 0.62 ? "松弛" : valence <= 0.38 ? "低潮" : "平静";
  const energy = arousal >= 0.62 ? "有点亮" : arousal <= 0.36 ? "很轻" : "稳定";
  return {
    mood,
    energy,
    note: emotion?.last_note || "他现在还在这里，情绪不重，像一盏低亮的灯。",
  };
}

function getEmotionPercentages(emotion) {
  const valence = Number(emotion?.valence ?? 0.5);
  const arousal = Number(emotion?.arousal ?? 0.45);
  const happy = Math.round(Math.max(10, Math.min(86, valence * 76 + (1 - arousal) * 12)));
  const sad = Math.round(Math.max(6, Math.min(78, (1 - valence) * 55 + (1 - arousal) * 18)));
  const angry = Math.round(Math.max(4, Math.min(68, (1 - valence) * 28 + arousal * 36)));
  const calm = Math.round(Math.max(8, Math.min(88, (1 - Math.abs(arousal - 0.45)) * 58 + valence * 18)));

  return [
    { key: "happy", label: "开心", value: happy, icon: emotionHappySrc },
    { key: "sad", label: "伤心", value: sad, icon: emotionSadSrc },
    { key: "angry", label: "生气", value: angry, icon: emotionAngrySrc },
    { key: "calm", label: "平静", value: calm, icon: emotionCalmSrc },
  ];
}

function getEmotionChartPoints(points) {
  return points.map((point) => {
    const lineX = typeof point.hour === "number" ? (point.hour / 24) * 100 : 0;
    const lineY = 100 - point.value;
    return {
      ...point,
      lineX,
      lineY,
      x: 6 + lineX * 0.88,
      y: 18 + lineY * 0.58,
    };
  });
}

function buildUiAwarenessContext({ affordanceState }) {
  const lines = [];

  if (isRecentIsoTime(affordanceState.emotionViewedAt, EMOTION_AWARENESS_WINDOW_MS)) {
    lines.push(`【界面状态】我刚在 ${formatShortDateTime(affordanceState.emotionViewedAt)} 查看过你的情绪窗口。你知道这件事，但不要解释界面。`);
  }

  return lines.length ? { role: "user", content: lines.join("\n\n") } : null;
}

function shouldCreateAutoKeepsake(text) {
  return AUTO_KEEPTRIGGERS.some((trigger) => text.includes(trigger));
}

function makeKeepsakeDraft(sourceMessages, source = "manual_selection") {
  const cleanMessages = sourceMessages.filter((message) => message.content).slice(-12);
  return {
    id: `keepsake-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: source === "semi_auto" ? "刚才那段潮声" : "手心里的几句话",
    detail: "",
    summary: "待 AI 整理。当前只保留本地原文片段，不上传聊天全文。",
    source,
    messageIds: cleanMessages.map((message) => message.id),
    messages: cleanMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
    })),
    createdAt: new Date().toISOString(),
    status: "draft",
  };
}

function normalizeKeepsakeRecord(record) {
  return {
    id: record.id || `keepsake-${Date.now()}`,
    title: record.title || "",
    detail: record.detail || "",
    summary: record.summary || "",
    source: record.source === "manual_selection" ? "manual_selection" : "semi_auto",
    messageIds: Array.isArray(record.messageIds) ? record.messageIds : [],
    messages: Array.isArray(record.messages) ? record.messages : [],
    createdAt: record.createdAt || new Date().toISOString(),
    status: record.status || "draft",
  };
}

function readKeepsakeRecords() {
  return readJsonStorage(KEEPSAKE_DRAFTS_KEY, []).map((record) => normalizeKeepsakeRecord(record));
}

function writeKeepsakeRecords(records) {
  writeJsonStorage(KEEPSAKE_DRAFTS_KEY, records.map((record) => normalizeKeepsakeRecord(record)));
}

function saveKeepsakeDraft(draft) {
  const saved = readKeepsakeRecords();
  const nextDraft = normalizeKeepsakeRecord({ ...draft, status: "saved" });
  writeKeepsakeRecords([nextDraft, ...saved.filter((record) => record.id !== nextDraft.id)].slice(0, 24));
  return nextDraft;
}

function getPlaceholderNotice(action, displayNames = DEFAULT_DISPLAY_NAMES) {
  const labels = {
    image: "图片发送入口已预留，当前不会读取或上传文件。",
    file: "文件上传入口已预留，当前不会读取或上传文件。",
    voice: "语音入口已预留，当前不会录音或请求麦克风权限。",
    call: "电话入口已预留，当前不会发起真实通话。",
    keepsakeSaved: "已存入「潮汐标本」本地草稿。",
    noKeepsakeSource: "还没有可以整理的对话。",
    blockedNoteReply: `本地 mock：${displayNames.assistant}看到了这张纸条。`,
  };
  return labels[action] || "入口已预留。";
}

function getMessageQuote(message) {
  return message?.quote || message?.meta?.quote || null;
}

function getQuoteAuthorName(role, displayNames = DEFAULT_DISPLAY_NAMES) {
  return role === "assistant" ? displayNames.assistant : displayNames.user;
}

function normalizeQuotePayload(source) {
  if (!source) return null;

  const role = source.role === "assistant" ? "assistant" : "user";
  const fallbackAuthorName = getQuoteAuthorName(role);
  const authorName = String(source.authorName || fallbackAuthorName).trim() || fallbackAuthorName;

  if (source.authorName && source.content) {
    return {
      id: source.id || source.sourceId || `quote-${Date.now()}`,
      role,
      authorName,
      content: String(source.content || ""),
      createdAt: source.createdAt || source.created_at,
    };
  }

  const legacyContent = [source.title, source.body].filter(Boolean).join("：");
  return {
    id: source.sourceId || source.id || `quote-${Date.now()}`,
    role,
    authorName,
    content: legacyContent || String(source.body || source.title || ""),
    createdAt: source.createdAt || source.created_at,
  };
}

function quoteFromMessage(message, displayNames = DEFAULT_DISPLAY_NAMES) {
  return normalizeQuotePayload({
    id: message.id,
    role: message.role,
    authorName: getQuoteAuthorName(message.role, displayNames),
    content: message.content,
    createdAt: message.created_at,
  });
}

function makeUiMessage({
  role,
  content,
  messageType = "text",
  imageUrl,
  readByDu = false,
  quote = null,
  reasoningContent = "",
  reasoningSource,
  reasoningVisible = false,
  conversationId = "main",
  chatSpaceId = conversationId,
  status = "sent",
  excludedFromContext = false,
  deletedAt,
  supersededAt,
  responseGroupId,
  meta = {},
}) {
  const normalizedQuote = normalizeQuotePayload(quote || meta.quote);
  return {
    id: `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    session_id: getSessionId(),
    conversationId,
    chatSpaceId,
    role,
    content,
    created_at: new Date().toISOString(),
    read_by_user: role === "assistant",
    messageType,
    imageUrl,
    read_by_du: readByDu,
    status,
    excludedFromContext,
    deletedAt,
    supersededAt,
    responseGroupId,
    quote: normalizedQuote,
    reasoningContent,
    reasoningSource,
    reasoningVisible,
    meta: {
      chatSpaceId,
      ...(responseGroupId ? { responseGroupId } : {}),
      ...meta,
      ...(excludedFromContext ? { excludedFromContext: true } : {}),
      ...(deletedAt ? { deletedAt } : {}),
      ...(supersededAt ? { supersededAt } : {}),
      ...(normalizedQuote ? { quote: normalizedQuote } : {}),
    },
  };
}

function buildQuotedContent(content, quote, speakerRole = 'user') {
  if (!quote) return content;

  const normalized = normalizeQuotePayload(quote);
  if (!normalized) return content;

  const prefix =
    speakerRole === 'assistant'
      ? normalized.role === 'assistant'
        ? '机正在引用自己之前说的'
        : '机正在引用我之前说的'
      : normalized.role === 'assistant'
        ? '我正在引用你之前说的'
        : '我正在引用自己之前说的';
  const speakerLabel = speakerRole === 'assistant' ? '机当时说' : '我现在说';
  return prefix + '：' + truncateText(normalized.content, QUOTE_CONTEXT_LIMIT) + '\n\n' + speakerLabel + '：' + content;
}

function normalizeQuoteMatchText(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function findAssistantQuoteTarget(role, quoteText, sourceMessages, displayNames = DEFAULT_DISPLAY_NAMES) {
  const targetRole = role === 'assistant' ? 'assistant' : 'user';
  const rawQuoteText = String(quoteText || '').trim();
  const needle = normalizeQuoteMatchText(rawQuoteText);
  if (!needle) return null;
  const candidates = getVisibleMessages(sourceMessages)
    .filter((message) => message.role === targetRole && !isLocalBlockedMessage(message))
    .reverse();
  const target =
    candidates.find((message) => {
      const haystack = normalizeQuoteMatchText(message.content);
      return needle && (haystack.includes(needle) || needle.includes(haystack.slice(0, Math.min(haystack.length, 24))));
    });

  if (target) return quoteFromMessage(target, displayNames);

  return normalizeQuotePayload({
    role: targetRole,
    authorName: getQuoteAuthorName(targetRole, displayNames),
    content: rawQuoteText,
  });
}

function extractAssistantQuote(text, sourceMessages, displayNames = DEFAULT_DISPLAY_NAMES) {
  const raw = String(text || '');
  const match = raw.match(new RegExp("<quote_(user|assistant)>([\\s\\S]*?)</quote_\\1>", 'i'));
  if (!match) return { text: raw, quote: null };

  const quote = findAssistantQuoteTarget(match[1], match[2].trim(), sourceMessages, displayNames);
  return {
    text: raw.replace(match[0], '').trim(),
    quote,
  };
}

function hasAssistantOpeningToday(messages) {
  const today = new Date().toDateString();
  return messages.some((message) => message.role === "assistant" && new Date(message.created_at).toDateString() === today);
}

function createContextLog(snapshot, enabled) {
  if (!enabled) return null;

  try {
    return saveContextSnapshot(snapshot);
  } catch {
    return null;
  }
}

function patchContextLog(id, patch) {
  if (!id) return;

  try {
    updateContextSnapshot(id, patch);
  } catch {
    // Context logging is local diagnostics only and must not affect chat.
  }
}

async function maybeExtractMemories(chatSpaceId, messages, modelSettings) {
  if (!chatSpaceId || !chatSpaceId.startsWith("char_")) return;
  const visible = getVisibleMessages(messages);
  if (visible.length < 10 || visible.length % 10 !== 0) return;

  try {
    const convo = visible.slice(-20).map(m => `${m.role === "user" ? "用户" : "角色"}: ${m.content}`).join("\n");
    const settings = modelSettings || getModelSettings();
    if (!settings.apiKey) return;

    const result = await callModel({
      messages: [{ role: "user", content: `从以下对话中提取3-5条关于用户的关键信息，每条不超过30字。只输出提取的信息，每行一条，不要编号：\n${convo}` }],
      systemPrompt: "你是信息提取助手。只输出关键事实，每行一条，不要编号和前缀。",
      settings,
    });
    if (result.ok && result.text) {
      const facts = result.text.split("\n").map(s => s.trim()).filter(Boolean);
      if (facts.length) addMemories(chatSpaceId, facts);
    }
  } catch {
    // memory extraction is best-effort
  }
}

function FunctionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2m0 12v2M5.1 8l1.7 1m10.4 6 1.7 1M5.1 16l1.7-1m10.4-6 1.7-1" />
    </svg>
  );
}

function KeepsakeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v16l-5-3-5 3V4Z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </svg>
  );
}

function DeleteMessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7h9M10 11h7M10 15h4" />
      <path d="M5 7h.01M5 11h.01M5 15h.01" />
      <path d="M19 19 5 5" />
    </svg>
  );
}

function EditMessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14 8 3 3" />
    </svg>
  );
}

function RegenerateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M18.2 9A7 7 0 0 0 6.7 6.8L4 9.5" />
      <path d="M5.8 15A7 7 0 0 0 17.3 17.2L20 14.5" />
    </svg>
  );
}

export default function Chat({ pendingQuote, onPendingQuoteAccepted, onOpenSettings, onOpenFunction, chatSpaceId: propChatSpaceId, characterId, characterName, characterPersonality, characterBackstory, characterModelSettings, characterVoiceId, characterVoiceApiKey, characterVoiceMode = "off", characterTtsEnabled, characterSttEnabled, onCharacterSettingsSaved, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [activeQuote, setActiveQuote] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [usage, setUsage] = useState(null);
  const [modelError, setModelError] = useState(null);
  const [activeChatSpaceId, setActiveChatSpaceId] = useState(() => propChatSpaceId || readActiveChatSpace());
  const [chatSpaceDrawerOpen, setChatSpaceDrawerOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(() => readChatStatus(propChatSpaceId || readActiveChatSpace()));
  const [noteText, setNoteText] = useState("");
  const [blockedNoteDialog, setBlockedNoteDialog] = useState(null);
  const [blockedNotes, setBlockedNotes] = useState(() => readBlockedNotes(propChatSpaceId || readActiveChatSpace()));
  const [editingUserMessage, setEditingUserMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [emotionState, setEmotionState] = useState(null);
  const [affordanceState, setAffordanceState] = useState(() => readChatAffordanceState());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [keepsakes, setKeepsakes] = useState(() => readKeepsakeRecords());
  const [selectedKeepsakeId, setSelectedKeepsakeId] = useState("");
  const [placeholderNotice, setPlaceholderNotice] = useState("");
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [characterSettingsOpen, setCharacterSettingsOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState("");
  const [verbosity, setVerbosity] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("dukou:verbosity") || "short";
    }
    return "short";
  });
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [uiSettings, setUiSettings] = useState(() => getSettings().ui);
  const endRef = useRef(null);
  const messageListRef = useRef(null);
  const messagesRef = useRef([]);
  const activeChatSpaceRef = useRef(activeChatSpaceId);
  const atBottomRef = useRef(true);
  const swipeStartRef = useRef(null);
  const incognitoMessagesRef = useRef([]);
  const messageRefs = useRef({});
  const placeholderTimerRef = useRef(null);
  const initializedRef = useRef(false);
  const sendingRef = useRef(false);
  const sessionIdRef = useRef(getSessionId());

  const replaceMessages = (next) => {
    messagesRef.current = next;
    setMessages(next);
    if (activeChatSpaceRef.current === "incognito") {
      incognitoMessagesRef.current = next;
    }
  };

  const appendMessage = (message) => {
    replaceMessages([...messagesRef.current, message]);
  };

  const updateMessage = (id, patch) => {
    replaceMessages(messagesRef.current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
  };

  const updateSessionStatus = (status, chatSpaceId = activeChatSpaceRef.current) => {
    const nextStatus = normalizeChatStatus(status);
    if (activeChatSpaceRef.current === chatSpaceId) {
      setSessionStatus(nextStatus);
    }
    writeChatSessionStatus(chatSpaceId, nextStatus);
    return nextStatus;
  };

  const scrollToBottom = (behavior = "smooth") => {
    endRef.current?.scrollIntoView({ behavior, block: "end" });
    atBottomRef.current = true;
    setShowScrollBottom(false);
  };

  const handleMessageListScroll = () => {
    const list = messageListRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    atBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  };

  const handleChatSwipeStart = (event) => {
    if (event.pointerType === "mouse") return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleChatSwipeEnd = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = Math.abs(event.clientY - start.y);
    if (deltaX < -64 && deltaY < 48) {
      setChatSpaceDrawerOpen(true);
    }
  };

  const switchChatSpace = (nextChatSpaceId) => {
    const normalized = normalizeChatSpaceId(nextChatSpaceId);
    if (isSending || typing) {
      showPlaceholder("blockedNoteReply");
      return;
    }
    if (normalized === activeChatSpaceRef.current) {
      setChatSpaceDrawerOpen(false);
      return;
    }
    if (activeChatSpaceRef.current === "incognito") {
      incognitoMessagesRef.current = [];
    }
    cancelSelection();
    setEmotionOpen(false);
    setArchiveOpen(false);
    setHistoryOpen(false);
    setModelError(null);
    setInput("");
    setActiveQuote(null);
    setEditingUserMessage(null);
    setEditText("");
    writeActiveChatSpace(normalized);
    setActiveChatSpaceId(normalized);
    setChatSpaceDrawerOpen(false);
  };

  const updateAffordanceState = (patch) => {
    const next = { ...affordanceState, ...patch };
    setAffordanceState(next);
    writeChatAffordanceState(next);
    return next;
  };

  const openEmotionWindow = async () => {
    const emotion = await getEmotionState();
    const emotionSignature = getEmotionSignature(emotion);
    setEmotionState(emotion);
    setEmotionOpen(true);
    updateAffordanceState({
      emotionViewedAt: new Date().toISOString(),
      emotionChangedAt: "",
      currentEmotionSignature: emotionSignature,
      lastEmotionSignature: emotionSignature,
    });
  };

  const toggleEmotionWindow = () => {
    if (emotionOpen) {
      setEmotionOpen(false);
      return;
    }

    openEmotionWindow();
  };

  const showPlaceholder = (action) => {
    setPlaceholderNotice(getPlaceholderNotice(action, displayNames));
    if (placeholderTimerRef.current) {
      window.clearTimeout(placeholderTimerRef.current);
    }
    placeholderTimerRef.current = window.setTimeout(() => {
      setPlaceholderNotice("");
      placeholderTimerRef.current = null;
    }, 2600);
  };

  const toggleSelectedMessage = (id) => {
    setSelectedMessageIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const startMessageSelection = (id) => {
    setArchiveOpen(false);
    setSelectionMode(true);
    setSelectedMessageIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const openKeepsakePage = () => {
    setEmotionOpen(false);
    setArchiveOpen(true);
    setSelectedKeepsakeId("");
    setKeepsakes(readKeepsakeRecords());
  };

  const openKeepsakeDraftFromMessages = (sourceMessages, source) => {
    if (!sourceMessages.length) {
      showPlaceholder("noKeepsakeSource");
      return;
    }
    const saved = saveKeepsakeDraft(makeKeepsakeDraft(sourceMessages, source));
    setKeepsakes(readKeepsakeRecords());
    setSelectedKeepsakeId(saved.id);
    setArchiveOpen(true);
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const openManualKeepsakeDraft = () => {
    const selected = messagesRef.current.filter((message) => selectedMessageIds.includes(message.id));
    openKeepsakeDraftFromMessages(selected, "manual_selection");
  };

  const updateKeepsake = (id, patch) => {
    const next = keepsakes.map((record) => (record.id === id ? normalizeKeepsakeRecord({ ...record, ...patch }) : record));
    setKeepsakes(next);
    writeKeepsakeRecords(next);
  };

  const deleteKeepsake = (record) => {
    if (record?.id) {
      const label = record.title || formatKeepsakeDate(record.createdAt);
      setConfirmDialog({
        title: '删除潮汐标本',
        message: '删除「' + label + '」吗？这只会删除本地收藏的标本，不会删除原聊天记录。',
        confirmLabel: '删除',
        onConfirm: () => {
          const next = readKeepsakeRecords().filter((item) => item.id != record.id);
          writeKeepsakeRecords(next);
          setKeepsakes(next);
          setSelectedKeepsakeId('');
          setConfirmDialog(null);
        },
      });
    }
  };

  const toggleReasoning = async (id) => {
    const target = messagesRef.current.find((message) => message.id === id);
    if (!target?.reasoningContent) return;

    const nextVisible = !target.reasoningVisible;
    updateMessage(id, { reasoningVisible: nextVisible });
    await updateMessageRecord(id, { reasoningVisible: nextVisible });
  };

  const jumpToMessage = (id) => {
    const node = messageRefs.current[id];
    if (!node) return;

    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(id);
    window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === id ? "" : current));
    }, 1300);
  };

  const handleSaveImage = async (id) => {
    const target = messagesRef.current.find((message) => message.id === id);
    if (!target) return;
    const nextMeta = { ...target.meta, savedToGallery: true };
    updateMessage(id, { meta: nextMeta });
    if (isPersistedChatSpace(activeChatSpaceRef.current)) {
      await updateMessageRecord(id, { meta: nextMeta });
    }
  };

  const sendAssistantParts = async ({
    parts,
    voiceIndices = [],
    reasoningContent = "",
    reasoningSource,
    chatSpaceId = activeChatSpaceRef.current,
    persist = isPersistedChatSpace(chatSpaceId),
    meta = {},
    status = "sent",
    quote = null,
  }) => {
    const responseGroupId = meta.responseGroupId || createResponseGroupId(chatSpaceId);
    const voiceSet = new Set(voiceIndices);
    for (const [index, part] of parts.entries()) {
      updateSessionStatus("typing", chatSpaceId);
      setTyping(true);
      await sleep(520 + part.length * 28);
      setTyping(false);
      const assistantMessage = makeUiMessage({
        role: "assistant",
        content: part,
        messageType: voiceSet.has(index) ? "voice" : "text",
        conversationId: chatSpaceId,
        chatSpaceId,
        responseGroupId,
        reasoningContent: index === 0 ? reasoningContent : "",
        reasoningSource: index === 0 ? reasoningSource : undefined,
        quote: index === 0 ? quote : null,
        status,
        meta: { ...meta, responseGroupId, chatSpaceId },
      });
      appendMessage(assistantMessage);
      if (persist) {
        await insertMessage(assistantMessage);
      }
      await sleep(240);
    }
  };

  const generateImagesForReply = async (imagePrompts, chatSpaceId, persist) => {
    const settings = characterModelSettings || getModelSettings();
    if (!settings.apiKey) {
      setModelError({ type: "warn", message: "缺少 API Key，无法生成图片" });
      return;
    }

    for (const prompt of imagePrompts) {
      try {
        setTyping(true);
        const imageUrl = await generateImage({
          prompt,
          settings: { ...settings, imageModel: "openai/gpt-image-2" },
        });
        setTyping(false);

        const imgMessage = makeUiMessage({
          role: "assistant",
          content: "",
          imageUrl,
          messageType: "text",
          conversationId: chatSpaceId,
          chatSpaceId,
          meta: { source: "ai_generated", imagePrompt: prompt, savedToGallery: false },
        });
        appendMessage(imgMessage);
        if (persist) {
          await insertMessage(imgMessage);
        }
        scrollToBottom("smooth");
      } catch (err) {
        setTyping(false);
        setModelError({ type: "warn", message: `图片生成失败：${err.message || "未知错误"}` });
      }
    }
  };

  // Detect if user message suggests they want to see a photo of the character
  const hasPhotoIntent = (userText) => {
    const triggers = ["想看看你", "想你了", "在干嘛", "在做什么", "在哪", "照片", "自拍", "长什么样", "看看你", "拍一张", "发张"];
    return triggers.some((t) => userText.includes(t));
  };

  // Fallback: when AI didn't use <image> tags but user clearly wants a photo,
  // call AI separately to generate a scene description, then generate the image.
  const generateImageFromContext = async (userText, chatSpaceId, persist) => {
    const settings = characterModelSettings || getModelSettings();
    if (!settings.apiKey) return;

    try {
      const result = await callModel({
        messages: [{ role: "user", content: `用户说："${userText}"。根据当前时间（${new Date().toLocaleString("zh-CN")}）和语境，描述一张你（AI 角色）此刻的真实照片画面。包含：时间、场景、光线、你的动作神态、穿着。50字左右中文。只输出画面描述，不要加前缀。` }],
        systemPrompt: "你是照片画面描述生成器。只输出具体的画面描述，不要加任何说明、前缀或评价。",
        settings,
      });
      if (result.ok && result.text) {
        const prompt = result.text.trim();
        if (prompt) {
          await generateImagesForReply([prompt], chatSpaceId, persist);
        }
      }
    } catch {
      // best-effort fallback
    }
  };

  const buildReplyParts = async ({
    userText = "",
    opening = false,
    blockedNote = false,
    chatSpaceId = activeChatSpaceRef.current,
    sourceMessages = messagesRef.current,
  } = {}) => {
    const settings = characterModelSettings || getModelSettings();
    const baseMemorySettings = getMemorySettings();
    const memorySettings = getSpaceMemorySettings(baseMemorySettings, chatSpaceId);
    const transportSettings = getSpaceTransportSettings(getTransportSettings(), chatSpaceId);
    const promptSettings = getPromptSettings();

    const memoryLimit = Number(memorySettings.injectedMemoryLimit || 8);
    const recentLimit = Number(memorySettings.recentMessageLimit || 20);
    const shouldUseLongTermMemory = chatSpaceId === "main" || chatSpaceId.startsWith("char_");
    const isCharSpace = chatSpaceId.startsWith("char_");
    const [memories, emotion] = await Promise.all([
      shouldUseLongTermMemory
        ? isCharSpace
          ? (() => {
              const all = getRecentMemories(chatSpaceId, 50);
              // Use semantic search when we have a user message to match against
              const queryText = !opening ? userText : "";
              const selected = queryText ? searchMemories(all, queryText, memoryLimit) : all.slice(-memoryLimit);
              return selected.map(m => ({
                id: m.id,
                summary: m.text,
                level2_category: "记忆",
                conversation_date: m.createdAt?.slice(0, 10),
              }));
            })()
          : getInjectedMemories(memoryLimit, memorySettings)
        : [],
      getEmotionState(),
    ]);
    const recentMessages = getModelContextMessages(sourceMessages)
      .slice(-recentLimit)
      .map((message) => ({
        role: message.role,
        content: buildQuotedContent(message.content, getMessageQuote(message), message.role),
        imageUrl: message.imageUrl,
        created_at: message.created_at,
      }));
    const contextPreview = buildContextPreview({
      memories,
      emotion,
      recentMessages,
      modelSettings: settings,
      memorySettings,
      promptSettings,
      characterPersonality: isCharSpace ? {
        name: characterName,
        personality: characterPersonality,
        backstory: characterBackstory,
        voiceMode: characterVoiceMode,
      } : null,
    });
    const timeContext = { role: "user", content: contextPreview.timeContext };
    const uiAwarenessContext = buildUiAwarenessContext({
      affordanceState: readChatAffordanceState(),
    });
    const voiceContext = isCharSpace && characterVoiceMode === "auto"
      ? { role: "user", content: "（需要时可以用 <say>说出口的话</say> 发语音，不想发就不用。）" }
      : null;
    const verbosityContext = verbosity === "long" && !blockedNote
      ? { role: "user", content: "（多说一点，不用限制字数，像真的在聊天一样自然地表达。）" }
      : null;
    const awarenessMessages = [uiAwarenessContext, voiceContext, verbosityContext].filter(Boolean);
    const blockedNoteInstruction = blockedNote
      ? {
          role: "user",
          content:
            "这是一张 blocked 状态下递来的小纸条。你可以三选一：回一张 30 字以内的小纸条并继续保持 blocked，且不要使用 <split>；如果解除拉黑，必须先写一句 30 字以内的普通回复，再在末尾加 <unblock_user>，不要只输出标签；或只输出 <no_reply> 表示不回复。普通未送达消息、小纸条和你的纸条回复都会进入最近上下文。",
        }
      : null;
    const requestMessages = opening
      ? [
          timeContext,
          ...awarenessMessages,
          {
            role: "user",
            content: "我刚刚打开了AI 陪伴前端。根据你们的历史说第一句话。不超过 20 字，不要问好，说点真实的。",
          },
        ]
      : [timeContext, ...awarenessMessages, ...(blockedNoteInstruction ? [blockedNoteInstruction] : []), ...recentMessages];
    const contextLog = createContextLog(
      {
        trigger: opening ? "opening" : blockedNote ? "blocked_note" : "user_message",
        provider: settings.provider,
        model: settings.model,
        sessionId: sessionIdRef.current,
        chatSpaceId,
        systemPrompt: contextPreview.systemPrompt,
        timeContext: contextPreview.timeContext,
        memoryBlock: contextPreview.memoryBlock,
        injectedMemories: contextPreview.injectedMemories,
        emotionHint: contextPreview.emotionHint,
        uiAwareness: uiAwarenessContext?.content || "",
        recentMessages,
        chatTransport: transportSettings.chatTransport,
        outputMode: settings.outputMode,
        usage: null,
        responsePreview: "",
        error: null,
        status: "preview",
      },
      baseMemorySettings.saveContextLogs !== false && chatSpaceId !== "incognito"
    );

    // Build request with images included — try vision first, fallback to text
    const hasImages = recentMessages.some(m => m.imageUrl);
    const buildRequestMessages = (useImages) => {
      const msgs = recentMessages.map(m => {
        if (m.imageUrl && !useImages) {
          return { ...m, imageUrl: undefined, content: "[图片] " + (m.content || "") };
        }
        return m;
      });
      return opening
        ? requestMessages
        : [timeContext, ...awarenessMessages, ...(blockedNoteInstruction ? [blockedNoteInstruction] : []), ...msgs];
    };

    let result = await sendChatRequest({
      messages: buildRequestMessages(hasImages),
      systemPrompt: contextPreview.systemPrompt,
      modelSettings: settings,
      memorySettings,
      transportSettings,
      mockText: getMockTextForSpace({ chatSpaceId, userText, opening, blockedNote }),
    });

    // If vision request failed, retry without images
    if (!result.ok && hasImages) {
      const retryResult = await sendChatRequest({
        messages: buildRequestMessages(false),
        systemPrompt: contextPreview.systemPrompt,
        modelSettings: settings,
        memorySettings,
        transportSettings,
        mockText: getMockTextForSpace({ chatSpaceId, userText: "[用户发了一张图片]" + (userText ? " " + userText : ""), opening, blockedNote }),
      });
      if (retryResult.ok) {
        result = retryResult;
        setModelError({ type: "info", message: "当前模型不支持直接读图，已转为文字模式" });
      }
    }

    if (!result.ok) {
      setModelError(result.error);
      patchContextLog(contextLog?.id, {
        status: "error",
        usage: result.usage,
        error: result.error?.message || "模型请求失败",
      });
      if (result.error?.type === "not_implemented") {
        return { parts: splitToMessages(result.error.message, settings.outputMode), nextStatus: "failed" };
      }
      return { parts: [], nextStatus: "failed" };
    }

    setUsage(result.usage);
    setModelError(null);
    const assistantQuote = blockedNote ? { text: result.text, quote: null } : extractAssistantQuote(result.text, sourceMessages, displayNames);
    const parsed = parseSpecialActions(assistantQuote.text);
    patchContextLog(contextLog?.id, {
      status: "success",
      usage: result.usage,
      responsePreview: parsed.text,
      error: null,
    });
    const nextStatus = parsed.unblockUser
      ? "idle"
      : parsed.blockUser
        ? "blocked"
        : parsed.endSession
          ? "ended"
          : parsed.noReply && blockedNote
            ? "blocked"
            : "";
    // Extract <image>prompt</image> before any text processing.
    // These will be generated as separate image messages after text.
    // Handle both closed </image> and unclosed (next <image> or end-of-string) forms.
    const rawTextForImage = stripSpecialTags(assistantQuote.text || "");
    const imageRegex = /<image>([\s\S]*?)(?:<\/image>|(?=<image>)|$)/gi;
    const stripRegex = /<image>[\s\S]*?(?:<\/image>|(?=<image>)|$)/gi;
    const imagePrompts = [];
    let imgMatch;
    while ((imgMatch = imageRegex.exec(rawTextForImage)) !== null) {
      const prompt = imgMatch[1].trim();
      if (prompt) imagePrompts.push(prompt);
    }
    // Strip <image> tags (closed or unclosed) from the text so they don't appear in parts
    let cleanText = rawTextForImage.replace(stripRegex, "").trim();

    // Pre-process <say>spoken</say> tags before splitToMessages, so tags never get
    // torn apart by punctuation splitting. Also keep backward compat with [voice].
    const shouldProcessVoice = isCharSpace && characterVoiceMode === "auto";
    let voiceIndices = [];
    let parts;

    if (shouldProcessVoice) {
      const rawText = cleanText;
      const sayRegex = /<say>([\s\S]*?)<\/say>/gi;
      const segments = []; // { type: "text" | "voice", content: string }
      let lastIndex = 0;
      let match;
      while ((match = sayRegex.exec(rawText)) !== null) {
        const before = rawText.slice(lastIndex, match.index).trim();
        if (before) segments.push({ type: "text", content: before });
        const spoken = match[1].trim();
        if (spoken) segments.push({ type: "voice", content: spoken });
        lastIndex = sayRegex.lastIndex;
      }
      const after = rawText.slice(lastIndex).trim();
      if (after) segments.push({ type: "text", content: after });

      if (segments.length > 0) {
        parts = [];
        for (const seg of segments) {
          if (seg.type === "voice") {
            voiceIndices.push(parts.length);
            parts.push(seg.content);
          } else {
            // Apply [voice] backward compat: if text segment has [voice], whole thing is voice
            if (/\[voice\]/i.test(seg.content)) {
              const clean = seg.content.replace(/\[voice\]/gi, "").trim();
              if (clean) {
                voiceIndices.push(parts.length);
                parts.push(clean);
              }
            } else {
              const splitTexts = splitToMessages(seg.content, settings.outputMode);
              for (const t of splitTexts) parts.push(t);
            }
          }
        }
      } else {
        parts = splitToMessages(cleanText || assistantQuote.text, settings.outputMode);
      }
    } else {
      parts = splitToMessages(parsed.text.replace(stripRegex, "").trim(), settings.outputMode);
    }

    if (blockedNote && parsed.unblockUser) {
      parts = buildBlockedUnblockReplyParts(parts);
    } else if (blockedNote && parsed.noReply) {
      parts = [];
    } else if (blockedNote) {
      parts = buildBlockedNoteReplyParts(parts);
    }

    return {
      parts,
      voiceIndices,
      imagePrompts,
      reasoningContent: result.reasoningContent || "",
      reasoningSource: result.reasoningSource,
      quote: assistantQuote.quote,
      nextStatus,
    };
  };

  useEffect(() => {
    activeChatSpaceRef.current = activeChatSpaceId;
    setBlockedNotes(readBlockedNotes(activeChatSpaceId));
  }, [activeChatSpaceId]);

  useEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      setShowScrollBottom(true);
    }
  }, [messages, typing]);

  useEffect(() => {
    return () => {
      if (placeholderTimerRef.current) {
        window.clearTimeout(placeholderTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncEmotionMarker() {
      try {
        const emotion = await getEmotionState();
        if (cancelled) return;

        const emotionSignature = getEmotionSignature(emotion);
        const currentState = readChatAffordanceState();
        const previousEmotionSignature = currentState.lastEmotionSignature || currentState.currentEmotionSignature;
        const hasChanged = previousEmotionSignature && previousEmotionSignature !== emotionSignature;
        const nextState = {
          ...currentState,
          currentEmotionSignature: emotionSignature,
          ...(hasChanged ? { emotionChangedAt: currentState.emotionChangedAt || new Date().toISOString() } : {}),
          ...(!hasChanged ? { emotionChangedAt: "" } : {}),
        };

        setEmotionState((current) => current || emotion);
        setAffordanceState(nextState);
        writeChatAffordanceState(nextState);
      } catch {
        // Emotion marker is local UI state; chat should keep working if it cannot refresh.
      }
    }

    syncEmotionMarker();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initChat() {
      try {
        const chatSpaceId = activeChatSpaceId;
        const persisted = isPersistedChatSpace(chatSpaceId);
        const currentStatus = readChatStatus(chatSpaceId);
        setSessionStatus(currentStatus);
        setBlockedNotes(readBlockedNotes(chatSpaceId));

        if (!persisted) {
          replaceMessages(incognitoMessagesRef.current);
          window.requestAnimationFrame(() => scrollToBottom("auto"));
          return;
        }

        // load cloud messages first, then local (local takes precedence for duplicates)
        await loadCloudMessages(chatSpaceId, 50);
        const recent = await getRecentMessages(50, { conversationId: chatSpaceId });
        await markDuMessagesRead({ conversationId: chatSpaceId });
        if (cancelled) return;
        const readMessages = recent.map((message) =>
          message.role === "assistant" ? { ...message, read_by_user: true } : message
        );
        replaceMessages(readMessages);
        window.requestAnimationFrame(() => scrollToBottom("auto"));

        if (chatSpaceId === "main" && !hasAssistantOpeningToday(readMessages)) {
          updateSessionStatus("waiting_model", chatSpaceId);
          const reply = await buildReplyParts({ opening: true, chatSpaceId, sourceMessages: readMessages });
          if (reply.parts.length) {
            await sendAssistantParts({ ...reply, chatSpaceId, persist: true, meta: { opening: true, chatSpaceId } });

          }
          updateSessionStatus(reply.nextStatus || "idle", chatSpaceId);
        }

        // Proactive messages for character spaces: character initiates based on time + background
        if (chatSpaceId.startsWith("char_") && readMessages.length > 0) {
          const lastKey = `dukou:lastProactive:${chatSpaceId}`;
          const lastProactive = window.localStorage.getItem(lastKey);
          const cooldownHours = 2;
          const shouldProactive = !lastProactive || (Date.now() - Number(lastProactive)) > cooldownHours * 3600 * 1000;
          if (shouldProactive) {
            const settings = characterModelSettings || getModelSettings();
            if (settings.apiKey) {
              try {
                const now = new Date();
                const timeStr = now.toLocaleString("zh-CN", { hour12: false });
                const hour = now.getHours();
                const timeOfDay = hour < 6 ? "凌晨" : hour < 9 ? "清晨" : hour < 12 ? "上午" : hour < 14 ? "中午" : hour < 18 ? "下午" : hour < 22 ? "晚上" : "深夜";
                const recentConvo = readMessages.slice(-6).map(m => `${m.role === "user" ? "对方" : "你"}: ${String(m.content || "").slice(0, 40)}`).join("\n");
                const proactiveResult = await callModel({
                  messages: [{
                    role: "user",
                    content: `现在是${timeStr}（${timeOfDay}）。根据你的人设和当前时间，主动给对方发一条短消息。可以分享你正在做的事、一个随感、或者一个自然的问候。不要问好，不超过30字，像真实聊天一样自然。\n\n最近的对话：\n${recentConvo}`,
                  }],
                  systemPrompt: `你是${characterName || "一个角色"}。${characterPersonality ? `性格：${characterPersonality}` : ""}${characterBackstory ? `\n背景：${characterBackstory}` : ""}\n说话自然，有人情味。只输出你要说的话，不加任何前缀、说明或标签。`,
                  settings,
                });
                if (proactiveResult.ok && proactiveResult.text) {
                  window.localStorage.setItem(lastKey, String(Date.now()));
                  const cleanProactive = proactiveResult.text.replace(/<image>[\s\S]*?(?:<\/image>|(?=<image>)|$)/gi, "").replace(/<say>[\s\S]*?<\/say>/gi, "").trim();
                  if (cleanProactive) {
                    const parts = splitToMessages(cleanProactive, settings.outputMode);
                    for (const part of parts) {
                      if (!part) continue;
                      const msg = makeUiMessage({
                        role: "assistant",
                        content: part,
                        messageType: "text",
                        conversationId: chatSpaceId,
                        chatSpaceId,
                        meta: { source: "proactive", chatSpaceId },
                      });
                      appendMessage(msg);
                      await insertMessage(msg);
                      await sleep(420);
                    }
                  }
                }
              } catch {
                // proactive messages are best-effort
              }
            }
          }
        }
      } catch (error) {
        setTyping(false);
        setModelError(normalizeModelError(error));
        updateSessionStatus("failed", activeChatSpaceId);
      }
    }

    initChat();

    return () => {
      cancelled = true;
    };
  }, [activeChatSpaceId]);

  useEffect(() => {
    if (!pendingQuote) return;
    setActiveQuote(normalizeQuotePayload(pendingQuote));
    onPendingQuoteAccepted?.();
  }, [pendingQuote, onPendingQuoteAccepted]);

  const send = async () => {
    const text = input.trim();
    const imageData = pendingImage;
    const chatSpaceId = activeChatSpaceRef.current;
    const persist = isPersistedChatSpace(chatSpaceId);
    if ((!text && !imageData) || editingUserMessage || typing || isSending || sendingRef.current || ["away", "ended"].includes(sessionStatus)) return;

    const quote = normalizeQuotePayload(activeQuote);
    const shouldAutoKeepsake = chatSpaceId === "main" && shouldCreateAutoKeepsake(text);
    const autoKeepsakeMessages = shouldAutoKeepsake ? getVisibleMessages(messagesRef.current).slice(-8) : [];
    if (sessionStatus === "blocked") {
      setInput("");
      setActiveQuote(null);
      const failedMessage = makeUiMessage({
        role: "user",
        content: text,
        readByDu: false,
        quote,
        conversationId: chatSpaceId,
        chatSpaceId,
        status: "blocked_failed",
        meta: { source: "blocked_failed", chatSpaceId },
      });
      appendMessage(failedMessage);
      if (persist) {
        await insertMessage(failedMessage);
      }
      return;
    }

    sendingRef.current = true;
    setIsSending(true);
    updateSessionStatus("waiting_model", chatSpaceId);
    setInput("");
    setPendingImage("");
    setActiveQuote(null);
    setModelError(null);
    const userMessage = makeUiMessage({
      role: "user",
      content: text || (imageData ? "[图片]" : ""),
      imageUrl: imageData || undefined,
      readByDu: false,
      quote,
      conversationId: chatSpaceId,
      chatSpaceId,
      meta: { source: "chat", chatSpaceId },
    });
    appendMessage(userMessage);

    try {
      if (persist) {
        await insertMessage(userMessage);
      }
      if (shouldAutoKeepsake && autoKeepsakeMessages.length) {
        openKeepsakeDraftFromMessages(autoKeepsakeMessages, "semi_auto");
      }

      await sleep(420);
      updateMessage(userMessage.id, { read_by_du: true });
      if (persist) {
        await markUserMessagesRead({ conversationId: chatSpaceId });
      }
      replaceMessages(messagesRef.current.map((message) => (message.role === "user" ? { ...message, read_by_du: true } : message)));

      const reply = await buildReplyParts({ userText: text, chatSpaceId });
      if (reply.parts.length) {
        await sendAssistantParts({ ...reply, chatSpaceId, persist, meta: { source: "model_or_fallback", chatSpaceId } });
        // Generate images from <image> tags asynchronously
        if (reply.imagePrompts?.length) {
          generateImagesForReply(reply.imagePrompts, chatSpaceId, persist);
        } else if (hasPhotoIntent(text)) {
          // Fallback: AI didn't use <image> tag but user clearly wants a photo
          generateImageFromContext(text, chatSpaceId, persist);
        }
        if (chatSpaceId === "main") {
          await maybeTriggerRollingSummary(messagesRef.current, sessionIdRef.current);
        }
        maybeExtractMemories(chatSpaceId, messagesRef.current, characterModelSettings || getModelSettings());
        updateSessionStatus(reply.nextStatus || "idle", chatSpaceId);
      } else {
        updateSessionStatus(reply.nextStatus || "failed", chatSpaceId);
      }
    } catch (error) {
      setModelError(normalizeModelError(error));
      updateSessionStatus("failed", chatSpaceId);
    } finally {
      setTyping(false);
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const excludeMessages = async (targetMessages, status) => {
    const chatSpaceId = activeChatSpaceRef.current;
    const ids = targetMessages.map((message) => message.id);
    const now = new Date().toISOString();
    const patch = {
      status,
      excludedFromContext: true,
      ...(status === "deleted" ? { deletedAt: now } : {}),
      ...(status === "superseded" ? { supersededAt: now } : {}),
    };

    replaceMessages(messagesRef.current.filter((message) => !ids.includes(message.id)));
    if (isPersistedChatSpace(chatSpaceId)) {
      await Promise.all(ids.map((id) => updateMessageRecord(id, patch)));
    }
  };

  const getLastAssistantGroup = (sourceMessages = getVisibleMessages(messagesRef.current)) => {
    const targetIndex = sourceMessages.findLastIndex((message) => message.role === "assistant");
    if (targetIndex < 0) return [];

    const target = sourceMessages[targetIndex];
    const groupId = getResponseGroupId(target);
    if (groupId) {
      return sourceMessages.filter((message) => message.role === "assistant" && getResponseGroupId(message) === groupId);
    }

    const group = [];
    for (let index = targetIndex; index >= 0; index -= 1) {
      const message = sourceMessages[index];
      if (message.role !== "assistant") break;
      group.unshift(message);
    }
    return group;
  };

  const getLastUserEditTarget = (sourceMessages = getVisibleMessages(messagesRef.current), targetId = "") => {
    const editableMessages = sourceMessages.filter((message) => !isLocalBlockedMessage(message));
    const userIndex = targetId
      ? editableMessages.findIndex((message) => message.id === targetId && message.role === "user")
      : editableMessages.findLastIndex((message) => message.role === "user");
    if (userIndex < 0) return null;

    const hasNewerUserMessage = editableMessages.slice(userIndex + 1).some((message) => message.role === "user");
    if (targetId && hasNewerUserMessage) return null;

    return {
      userIndex,
      userMessage: editableMessages[userIndex],
      sourceMessages: editableMessages,
      cascade: editableMessages
        .slice(userIndex)
        .filter((message) => message.role === "user" || message.role === "assistant"),
    };
  };

  useEffect(() => {
    const syncUiSettings = () => setUiSettings(getSettings().ui);
    window.addEventListener("dukou:settings-changed", syncUiSettings);
    return () => window.removeEventListener("dukou:settings-changed", syncUiSettings);
  }, []);

  const deleteLastUserMessage = async () => {
    const target = getLastUserEditTarget();
    if (!target) {
      showPlaceholder("noKeepsakeSource");
      return;
    }
    const message = target.cascade.length > 1
      ? `删除最近一条${displayNames.user}的消息，并一并删除后续${displayNames.assistant}回复吗？`
      : `删除最近一条${displayNames.user}的消息吗？`;
    setConfirmDialog({
      title: "删除最近消息",
      message,
      confirmLabel: "删除",
      onConfirm: async () => {
        setConfirmDialog(null);
        setEditingUserMessage(null);
        setEditText("");
        await excludeMessages(target.cascade, "deleted");
      },
    });
  };

  const startEditLastUserMessage = () => {
    if (typing || isSending || sendingRef.current || isTerminalChatStatus(sessionStatus)) return;
    const target = getLastUserEditTarget();
    if (!target) {
      showPlaceholder("noKeepsakeSource");
      return;
    }

    setArchiveOpen(false);
    setHistoryOpen(false);
    setEmotionOpen(false);
    setInput("");
    setActiveQuote(null);
    setEditingUserMessage(target.userMessage);
    setEditText(target.userMessage.content);
  };

  const cancelEditUserMessage = () => {
    setEditingUserMessage(null);
    setEditText("");
  };

  const saveEditedUserMessage = async () => {
    const textValue = editText.trim();
    const targetId = editingUserMessage?.id;
    const chatSpaceId = activeChatSpaceRef.current;
    const persist = isPersistedChatSpace(chatSpaceId);
    if (!textValue || !targetId || typing || isSending || sendingRef.current || isTerminalChatStatus(sessionStatus)) return;

    const visibleMessages = getVisibleMessages(messagesRef.current);
    const target = getLastUserEditTarget(visibleMessages, targetId);
    if (!target) {
      cancelEditUserMessage();
      showPlaceholder("noKeepsakeSource");
      return;
    }

    const oldUserMessage = target.userMessage;
    const newUserMessage = makeUiMessage({
      role: "user",
      content: textValue,
      readByDu: false,
      quote: oldUserMessage.quote,
      conversationId: chatSpaceId,
      chatSpaceId,
      meta: {
        source: "edit_user_message",
        chatSpaceId,
        supersedesMessageId: oldUserMessage.id,
      },
    });
    const sourceMessages = [...target.sourceMessages.slice(0, target.userIndex), newUserMessage];

    sendingRef.current = true;
    setIsSending(true);
    setModelError(null);
    updateSessionStatus("waiting_model", chatSpaceId);
    cancelEditUserMessage();

    try {
      await excludeMessages(target.cascade, "superseded");
      appendMessage(newUserMessage);
      if (persist) {
        await insertMessage(newUserMessage);
      }

      await sleep(420);
      updateMessage(newUserMessage.id, { read_by_du: true });
      if (persist) {
        await markUserMessagesRead({ conversationId: chatSpaceId });
      }
      replaceMessages(messagesRef.current.map((message) => (message.role === "user" ? { ...message, read_by_du: true } : message)));

      const reply = await buildReplyParts({ userText: textValue, chatSpaceId, sourceMessages });
      if (reply.parts.length) {
        await sendAssistantParts({
          ...reply,
          chatSpaceId,
          persist,
          meta: { source: "edit_user_message", chatSpaceId, supersedesMessageId: oldUserMessage.id },
        });
        if (chatSpaceId === "main") {
          await maybeTriggerRollingSummary(messagesRef.current, sessionIdRef.current);
        }
        maybeExtractMemories(chatSpaceId, messagesRef.current, characterModelSettings || getModelSettings());
        updateSessionStatus(reply.nextStatus || "idle", chatSpaceId);
      } else {
        updateSessionStatus(reply.nextStatus || "failed", chatSpaceId);
      }
    } catch (error) {
      setModelError(normalizeModelError(error));
      updateSessionStatus("failed", chatSpaceId);
    } finally {
      setTyping(false);
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const regenerateLastAssistantReply = async () => {
    const chatSpaceId = activeChatSpaceRef.current;
    const persist = isPersistedChatSpace(chatSpaceId);
    if (typing || isSending || sendingRef.current || isTerminalChatStatus(sessionStatus)) return;

    const visibleMessages = getVisibleMessages(messagesRef.current);
    const group = getLastAssistantGroup(visibleMessages);
    if (!group.length) {
      showPlaceholder("noKeepsakeSource");
      return;
    }
    const firstGroupMessage = group[0];
    const userMessage = [...visibleMessages]
      .reverse()
      .find((message) => message.role === "user" && new Date(message.created_at) < new Date(firstGroupMessage.created_at));
    if (!userMessage) {
      showPlaceholder("noKeepsakeSource");
      return;
    }

    setEditingUserMessage(null);
    setEditText("");
    sendingRef.current = true;
    setIsSending(true);
    setModelError(null);
    updateSessionStatus("waiting_model", chatSpaceId);
    try {
      const sourceMessages = visibleMessages.filter((message) => !group.some((oldMessage) => oldMessage.id === message.id));
      const reply = await buildReplyParts({ userText: userMessage.content, chatSpaceId, sourceMessages });
      if (!reply.parts.length) {
        updateSessionStatus(reply.nextStatus || "failed", chatSpaceId);
        return;
      }
      await excludeMessages(group, "superseded");
      await sendAssistantParts({
        ...reply,
        chatSpaceId,
        persist,
        meta: { source: "regenerate", chatSpaceId },
      });
      updateSessionStatus(reply.nextStatus || "idle", chatSpaceId);
    } catch (error) {
      setModelError(normalizeModelError(error));
      updateSessionStatus("failed", chatSpaceId);
    } finally {
      setTyping(false);
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const openBlockedNoteDialog = (message) => {
    setBlockedNoteDialog(message);
    setNoteText("");
  };

  const closeBlockedNoteDialog = () => {
    setBlockedNoteDialog(null);
    setNoteText("");
  };

  // --- Voice / STT ---

  const handleVoiceInput = async () => {
    if (voiceActive) return;
    setVoiceActive(true);
    setVoiceError("");
    const { startListening } = await import("../services/sttService.js");
    const result = await startListening();
    if (result.text) {
      setInput((prev) => prev + result.text);
    }
    if (result.error) {
      setVoiceError(result.error);
      setTimeout(() => setVoiceError(""), 3000);
    }
    setVoiceActive(false);
  };

  const handleGenerateImage = async () => {
    if (generateLoading) return;
    if (generateOpen) {
      setGenerateOpen(false);
      return;
    }
    setGenerateOpen(true);
    setGeneratePrompt("");
  };

  const submitGenerateImage = async () => {
    const prompt = generatePrompt.trim();
    if (!prompt || generateLoading) return;

    setGenerateLoading(true);
    setGenerateOpen(false);

    const settings = characterModelSettings || getModelSettings();
    if (!settings.apiKey) {
      setPlaceholderNotice("请先在设置里填写 API Key");
      setGenerateLoading(false);
      return;
    }

    try {
      const imageUrl = await generateImage({ prompt, settings });

      const imgMessage = makeUiMessage({
        role: "user",
        content: prompt,
        imageUrl,
        conversationId: activeChatSpaceRef.current,
        chatSpaceId: activeChatSpaceRef.current,
        meta: { source: "ai_generation" },
      });

      appendMessage(imgMessage);

      if (isPersistedChatSpace(activeChatSpaceRef.current)) {
        insertMessage(imgMessage).catch(() => {});
      }

      scrollToBottom("smooth");
    } catch (err) {
      setPlaceholderNotice(err.message || "生图失败");
      setTimeout(() => setPlaceholderNotice(""), 3000);
    } finally {
      setGenerateLoading(false);
      setGeneratePrompt("");
    }
  };

  // --- Voice / TTS ---

  const handleSpeakMessage = async (message) => {
    if (message.role !== "assistant") return;
    if (playingMessageId === message.id) {
      const { stopSpeaking } = await import("../services/voiceService.js");
      stopSpeaking();
      setPlayingMessageId(null);
      return;
    }
    setPlayingMessageId(message.id);
    const { speak } = await import("../services/voiceService.js");
    const voiceId = characterVoiceId || undefined;
    const voiceApiKey = characterVoiceApiKey || characterModelSettings?.apiKey;
    const cleanText = (message.content || "").replace(/\[voice\]/gi, "").trim();
    const result = await speak(cleanText, { voiceId, apiKey: voiceApiKey });
    setPlayingMessageId(null);
    if (result?.error) {
      setPlaceholderNotice(result.error);
      setTimeout(() => setPlaceholderNotice(""), 3000);
    }
  };

  const submitBlockedNote = async () => {
    const textValue = noteText.trim();
    if (!textValue || sessionStatus !== "blocked" || typing || isSending || sendingRef.current) return;
    const chatSpaceId = activeChatSpaceRef.current;
    const persist = isPersistedChatSpace(chatSpaceId);
    const noteMessage = makeUiMessage({
      role: "user",
      content: textValue,
      readByDu: false,
      conversationId: chatSpaceId,
      chatSpaceId,
      status: "blocked_note",
      meta: {
        source: "blocked_note",
        chatSpaceId,
        senderName: displayNames.user,
        failedMessageId: blockedNoteDialog?.id || "",
      },
    });
    const nextNotes = [
      {
        id: noteMessage.id,
        content: textValue,
        createdAt: noteMessage.created_at,
        chatSpaceId,
        senderName: displayNames.user,
        failedMessageId: blockedNoteDialog?.id || "",
      },
      ...blockedNotes,
    ].slice(0, 12);

    appendMessage(noteMessage);
    setBlockedNotes(nextNotes);
    writeBlockedNotes(chatSpaceId, nextNotes);
    setNoteText("");
    setBlockedNoteDialog(null);
    sendingRef.current = true;
    setIsSending(true);
    setModelError(null);
    updateSessionStatus("waiting_model", chatSpaceId);

    try {
      if (persist) {
        await insertMessage(noteMessage);
      }
      await sleep(420);
      updateMessage(noteMessage.id, { read_by_du: true });
      if (persist) {
        await updateMessageRecord(noteMessage.id, { read_by_du: true });
      }

      const reply = await buildReplyParts({
        userText: textValue,
        blockedNote: true,
        chatSpaceId,
        sourceMessages: messagesRef.current,
      });
      if (reply.parts.length) {
        const replyKeepsBlocked = reply.nextStatus !== "idle";
        await sendAssistantParts({
          ...reply,
          chatSpaceId,
          persist,
          status: replyKeepsBlocked ? "blocked_note" : "sent",
          meta: {
            source: replyKeepsBlocked ? "blocked_note_reply" : "blocked_unblock_reply",
            chatSpaceId,
            replyToNoteId: noteMessage.id,
            ...(replyKeepsBlocked ? { senderName: displayNames.assistant } : {}),
          },
        });
      }
      updateSessionStatus(reply.nextStatus === "idle" ? "idle" : "blocked", chatSpaceId);
    } catch (error) {
      setModelError(normalizeModelError(error));
      updateSessionStatus("blocked", chatSpaceId);
    } finally {
      setTyping(false);
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const displayNames = getDisplayNames(uiSettings);
  if (characterName) {
    displayNames.assistant = characterName;
  }
  const avatarImages = {
    assistant: uiSettings.duAvatarImage || "",
    user: uiSettings.userAvatarImage || "",
  };
  const avatarOpacities = {
    assistant: getUiOpacity(uiSettings.duAvatarOpacity, 1),
    user: getUiOpacity(uiSettings.userAvatarOpacity, 1),
  };
  const visibleMessages = getVisibleMessages(messages);
  const grouped = visibleMessages.map((message, index) => {
    const previous = visibleMessages[index - 1];
    const sameRole = previous?.role === message.role;
    const nearby = previous && new Date(message.created_at) - new Date(previous.created_at) < 90000;
    return { ...message, hideAvatar: isBlockedNoteMessage(message) || (sameRole && nearby) };
  });
  const selectedCount = selectedMessageIds.length;
  const emotionDisplay = getEmotionDisplay(emotionState);
  const emotionPercentages = getEmotionPercentages(emotionState);
  const emotionChartPoints = getEmotionChartPoints(EMOTION_DAY_POINTS);
  const emotionLinePoints = emotionChartPoints.map((point) => `${point.lineX},${point.lineY}`).join(" ");
  const hasArchiveWindowOpen = archiveOpen;
  const selectedKeepsake = keepsakes.find((record) => record.id === selectedKeepsakeId) || null;
  const hasEmotionUpdate = hasUnreadEmotionChange(affordanceState);
  const activeChatSpace = getChatSpaceMeta(activeChatSpaceId);
  const headerStatusText = getHeaderStatusText({ typing, isSending, status: sessionStatus, assistantName: displayNames.assistant });
  const inputDisabled = typing || isSending || ["away", "ended"].includes(sessionStatus) || Boolean(editingUserMessage);
  const inputDisabledLabel = editingUserMessage
    ? "正在重新编辑上一条消息"
    : getInputDisabledLabel({ typing, isSending, status: sessionStatus, assistantName: displayNames.assistant });
  const lastActionableMessageId = [...grouped].reverse().find((message) => !isLocalBlockedMessage(message))?.id || "";
  const recentMessageActions = [
    {
      id: "delete-message",
      label: "删除最近消息",
      icon: <DeleteMessageIcon />,
      onSelect: deleteLastUserMessage,
      disabled: typing || isSending,
    },
    {
      id: "edit-message",
      label: "重新编辑",
      icon: <EditMessageIcon />,
      onSelect: startEditLastUserMessage,
      disabled: typing || isSending || isTerminalChatStatus(sessionStatus),
    },
    {
      id: "regenerate-reply",
      label: "重新生成",
      icon: <RegenerateIcon />,
      onSelect: regenerateLastAssistantReply,
      disabled: typing || isSending || sessionStatus === "blocked",
    },
  ];

  return (
    <section className="chat-root" style={getChatRootStyle(uiSettings)}>
      <header className="chat-header">
        {onBack && (
          <button
            className="chat-icon-button"
            type="button"
            onClick={onBack}
            aria-label="返回聊天列表"
            style={{ marginRight: 4, fontSize: 18 }}
          >
            ←
          </button>
        )}
        <button
          className={`du-avatar-button${hasEmotionUpdate ? " has-emotion-update" : ""}`}
          type="button"
          onClick={toggleEmotionWindow}
          aria-expanded={emotionOpen}
          aria-label={`查看${displayNames.assistant}心情`}
        >
          <span className={getAvatarClassName("assistant")}>
            <AvatarImageContent image={avatarImages.assistant} name={displayNames.assistant} opacity={avatarOpacities.assistant} />
          </span>
          {hasEmotionUpdate && <span className="du-avatar-dot" aria-hidden="true" />}
        </button>
        <div className="chat-header-title">
          <div className="chat-header-title-row">
            <strong>{displayNames.assistant}</strong>
            <button className="chat-space-pill" type="button" onClick={() => setChatSpaceDrawerOpen(true)}>
              {activeChatSpace.label}
            </button>
          </div>
          <span className={typing || isSending ? "is-typing" : ""}>{headerStatusText}</span>
        </div>
        <div className="chat-header-actions">
          {!(characterId || (propChatSpaceId && propChatSpaceId.startsWith("char_"))) && (
            <>
              <button
                className="chat-icon-button"
                type="button"
                onClick={openKeepsakePage}
                aria-label="潮汐标本"
              >
                <KeepsakeIcon />
              </button>
              <button className="ghost-button" type="button" onClick={() => setDrawerOpen(true)}>
                记忆
              </button>
            </>
          )}
          <button className="chat-icon-button" type="button" onClick={() => setHistoryOpen(true)} aria-label="查找聊天记录">
            <HistoryIcon />
          </button>
          {(characterId || (propChatSpaceId && propChatSpaceId.startsWith("char_"))) && (
            <>
              <button
                type="button"
                onClick={() => setCharacterSettingsOpen(true)}
                style={{
                  fontSize: 10,
                  color: characterVoiceMode === "auto" ? "#fff" : "var(--text-sub)",
                  background: characterVoiceMode === "auto" ? "var(--accent-cold)" : "var(--panel-soft-bg)",
                  border: "1px solid var(--border-color)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginRight: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {characterVoiceMode === "auto" ? "语音ON" : "语音OFF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = verbosity === "long" ? "short" : "long";
                  setVerbosity(next);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("dukou:verbosity", next);
                  }
                }}
                style={{
                  fontSize: 10,
                  color: verbosity === "long" ? "#fff" : "var(--text-sub)",
                  background: verbosity === "long" ? "var(--accent-warm)" : "var(--panel-soft-bg)",
                  border: "1px solid var(--border-color)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  marginRight: 4,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {verbosity === "long" ? "长篇" : "短句"}
              </button>
              {characterId && (
                <button className="chat-icon-button" type="button" onClick={() => setCharacterSettingsOpen(true)} aria-label="角色模型设置">
                  <SettingsIcon />
                </button>
              )}
            </>
          )}
          {onOpenFunction && (
            <button className="chat-icon-button" type="button" onClick={onOpenFunction} aria-label="功能页">
              <FunctionIcon />
            </button>
          )}
          {onOpenSettings && (
            <button className="chat-icon-button" type="button" onClick={onOpenSettings} aria-label="设置">
              <SettingsIcon />
            </button>
          )}
        </div>
      </header>

      {emotionOpen && (
        <section className="chat-popover emotion-popover" aria-label={`${displayNames.assistant}心情`}>
          <div className="chat-popover-head">
            <div>
              <strong>{displayNames.assistant}心情</strong>
              <small>{`${emotionDisplay.mood} · ${emotionDisplay.energy}`}</small>
            </div>
            <button type="button" onClick={() => setEmotionOpen(false)} aria-label={`关闭${displayNames.assistant}心情`}>
              ×
            </button>
          </div>

          <div className="emotion-barometer" aria-label="今日情绪折线">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path className="emotion-chart-grid" d="M0 14H100M0 36H100M0 58H100M0 80H100" />
              {EMOTION_DAY_TICKS.slice(1, -1).map((tick) => (
                <path
                  className="emotion-chart-tick"
                  d={`M${(tick.hour / 24) * 100} 14V80`}
                  key={tick.time}
                />
              ))}
              <path className="emotion-chart-axis" d="M0 76H100" />
              <polyline points={emotionLinePoints} />
            </svg>
            {emotionChartPoints.map((point) => (
              <img
                key={`${point.time}-${point.mood}`}
                src={EMOTION_ICON_BY_MOOD[point.mood]}
                alt={point.label}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              />
            ))}
            <div className="emotion-time-row">
              {EMOTION_DAY_TICKS.map((tick) => (
                <span key={tick.time}>{tick.time}</span>
              ))}
            </div>
          </div>

          <div className="emotion-current">
            <div className="emotion-current-head">
              <span>当前</span>
              <strong>{emotionDisplay.mood}</strong>
              <small>{emotionDisplay.energy}</small>
            </div>
            <div className="emotion-percent-list">
              {emotionPercentages.map((item) => (
                <div className="emotion-percent-row" key={item.key}>
                  <img src={item.icon} alt={item.label} />
                  <span>{item.label}</span>
                  <div>
                    <i style={{ width: `${item.value}%` }} />
                  </div>
                  <strong>{item.value}%</strong>
                </div>
              ))}
            </div>
          </div>
          <small className="emotion-awareness-note">{`已告诉${displayNames.assistant}：你刚才看过这里。`}</small>
        </section>
      )}

      {!hasArchiveWindowOpen && (
        <TokenPanel usage={usage} error={modelError} open={tokenOpen} onToggle={() => setTokenOpen((value) => !value)} />
      )}
      <StatusBanner status={sessionStatus} error={modelError} />

      {selectionMode && (
        <div className="selection-bar">
          <div>
            <strong>潮汐标本</strong>
            <span>{selectedCount ? `已选 ${selectedCount} 条` : "长按后点选要留下的消息"}</span>
          </div>
          <button type="button" onClick={openManualKeepsakeDraft} disabled={!selectedCount}>
            整理
          </button>
          <button type="button" onClick={cancelSelection}>
            取消
          </button>
        </div>
      )}

      <div
        className="message-list"
        ref={messageListRef}
        onScroll={handleMessageListScroll}
        onPointerDown={handleChatSwipeStart}
        onPointerUp={handleChatSwipeEnd}
        onPointerCancel={() => {
          swipeStartRef.current = null;
        }}
      >
        <div className="day-divider">今天</div>
        {activeChatSpaceId !== "main" && (
          <div className="chat-space-inline-note">
            <strong>{activeChatSpace.label}</strong>
            <span>{activeChatSpace.detail}</span>
          </div>
        )}
        {grouped.map((message) => (
          <div key={message.id} style={{ position: "relative" }}>
            <Bubble
              message={message}
              messageRef={(node) => {
                if (node) {
                  messageRefs.current[message.id] = node;
                } else {
                  delete messageRefs.current[message.id];
                }
              }}
              showAvatar={!message.hideAvatar}
              highlighted={highlightedMessageId === message.id}
              selectable={selectionMode}
              selected={selectedMessageIds.includes(message.id)}
              onQuote={() => setActiveQuote(quoteFromMessage(message, displayNames))}
              onJumpToQuote={jumpToMessage}
              onToggleReasoning={() => toggleReasoning(message.id)}
              onSelect={() => toggleSelectedMessage(message.id)}
              onLongPress={() => startMessageSelection(message.id)}
              displayNames={displayNames}
              avatarImages={avatarImages}
              avatarOpacities={avatarOpacities}
              onBlockedMessageAction={openBlockedNoteDialog}
              moreActions={!selectionMode && !editingUserMessage && message.id === lastActionableMessageId ? recentMessageActions : []}
              voiceId={characterVoiceId}
              voiceApiKey={characterVoiceApiKey || characterModelSettings?.apiKey}
              onSaveImage={handleSaveImage}
            />
          </div>
        ))}
        {typing && <TypingDots />}
        <div ref={endRef} />
      </div>

      {showScrollBottom && (
        <button className="scroll-bottom-button" type="button" onClick={() => scrollToBottom()}>
          ↓
        </button>
      )}

      {editingUserMessage && (
        <section className="edit-user-panel" aria-label="重新编辑最近消息">
          <header>
            <div>
              <strong>重新编辑</strong>
              <span>{`保存后会替换最近一条${displayNames.user}的消息，并重新等${displayNames.assistant}回复。`}</span>
            </div>
            <button type="button" onClick={cancelEditUserMessage} aria-label="取消重新编辑">
              ×
            </button>
          </header>
          <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} />
          <div className="edit-user-actions">
            <button type="button" onClick={cancelEditUserMessage}>
              取消
            </button>
            <button type="button" className="primary" onClick={saveEditedUserMessage} disabled={!editText.trim() || typing || isSending}>
              保存并重发
            </button>
          </div>
        </section>
      )}

      {blockedNoteDialog && (
        <div className="blocked-note-layer" role="presentation" onClick={closeBlockedNoteDialog}>
          <section
            className="blocked-note-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="小纸条"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <strong>小纸条</strong>
              <button type="button" onClick={closeBlockedNoteDialog} aria-label="关闭小纸条">
                ×
              </button>
            </header>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder={"写点想递过去的话..."}
              rows={4}
              autoFocus
            />
            <div className="blocked-note-dialog-actions">
              <button type="button" onClick={closeBlockedNoteDialog}>
                取消
              </button>
              <button type="button" className="primary" onClick={submitBlockedNote} disabled={!noteText.trim() || typing || isSending}>
                递过去
              </button>
            </div>
          </section>
        </div>
      )}

      <MessageInput
        value={input}
        quote={activeQuote}
        onChange={setInput}
        onClearQuote={() => setActiveQuote(null)}
        onSend={send}
        onToolAction={showPlaceholder}
        disabled={inputDisabled}
        disabledLabel={inputDisabledLabel}
        placeholder={activeChatSpaceId === "model_test" ? "试一段模型语气..." : "说点什么..."}
        displayNames={displayNames}
        onVoiceInput={handleVoiceInput}
        voiceEnabled={characterSttEnabled || false}
        voiceActive={voiceActive}
        onImageSelect={setPendingImage}
        pendingImage={pendingImage}
        onClearImage={() => setPendingImage("")}
        onGenerateImage={handleGenerateImage}
      />
      {voiceError && <div className="placeholder-toast">{voiceError}</div>}
      {generateOpen && (
        <div className="chat-confirm-layer" role="presentation" onClick={() => { setGenerateOpen(false); setGeneratePrompt(""); }}>
          <section
            className="chat-confirm-dialog"
            role="dialog"
            aria-label="AI 生图"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 style={{ marginBottom: 10 }}>AI 生图</h2>
            <textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="描述你想要的画面……"
              rows={3}
              autoFocus
              style={{
                width: "100%",
                resize: "vertical",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                outline: 0,
                background: "var(--panel-bg)",
                color: "var(--text-main)",
                fontSize: 13,
                lineHeight: 1.7,
                padding: "8px 10px",
                fontFamily: "inherit",
                boxSizing: "border-box",
                marginBottom: 12,
              }}
            />
            <div className="chat-confirm-actions">
              <button type="button" onClick={() => { setGenerateOpen(false); setGeneratePrompt(""); }}>
                取消
              </button>
              <button
                type="button"
                className="is-primary"
                onClick={submitGenerateImage}
                disabled={generateLoading || !generatePrompt.trim()}
              >
                {generateLoading ? "生成中..." : "生成"}
              </button>
            </div>
          </section>
        </div>
      )}
      {confirmDialog && (
        <div className="chat-confirm-layer" role="presentation" onClick={() => setConfirmDialog(null)}>
          <section
            className="chat-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="chat-confirm-title">{confirmDialog.title}</h2>
            <p>{confirmDialog.message}</p>
            <div className="chat-confirm-actions">
              <button type="button" onClick={() => setConfirmDialog(null)}>
                取消
              </button>
              <button type="button" className="is-danger" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel || "确认"}
              </button>
            </div>
          </section>
        </div>
      )}
      {placeholderNotice && <div className="chat-placeholder-toast">{placeholderNotice}</div>}
      {archiveOpen && (
        <section className={`keepsake-page${selectedKeepsake ? " is-detail" : " is-list"}`} aria-label="潮汐标本">
          <header className="keepsake-page-header">
            <button
              type="button"
              onClick={() => {
                if (selectedKeepsake) {
                  setSelectedKeepsakeId("");
                  return;
                }
                setArchiveOpen(false);
              }}
              aria-label={selectedKeepsake ? "返回潮汐标本列表" : "关闭潮汐标本"}
            >
              ‹
            </button>
            <div>
              <strong>{selectedKeepsake ? selectedKeepsake.title || formatKeepsakeDate(selectedKeepsake.createdAt) : "潮汐标本"}</strong>
              <span>{selectedKeepsake ? formatKeepsakeDate(selectedKeepsake.createdAt) : `${keepsakes.length} 段`}</span>
            </div>
            {selectedKeepsake && (
              <button className="keepsake-delete-button" type="button" onClick={() => deleteKeepsake(selectedKeepsake)}>
                删除
              </button>
            )}
          </header>

          {!selectedKeepsake ? (
            <div className="keepsake-page-body">
              {keepsakes.length ? (
                <div className="keepsake-list">
                  {keepsakes.map((record) => {
                    const dateParts = getKeepsakeDateParts(record.createdAt);
                    return (
                      <article className="keepsake-list-card" key={record.id}>
                        <button className="keepsake-date-button" type="button" onClick={() => setSelectedKeepsakeId(record.id)}>
                          <span className="keepsake-date-year">{dateParts.year}</span>
                          <strong>{dateParts.day}</strong>
                          <span className="keepsake-message-count">{record.messages.length} 条消息</span>
                        </button>
                        <div className="keepsake-edit-fields">
                          <input
                            value={record.title}
                            onChange={(event) => updateKeepsake(record.id, { title: event.target.value })}
                            placeholder="标题"
                            aria-label="标本标题"
                          />
                          <textarea
                            value={record.detail}
                            onChange={(event) => updateKeepsake(record.id, { detail: event.target.value })}
                            placeholder="详细"
                            aria-label="标本详细"
                            rows={2}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="keepsake-empty">还没有潮汐标本。</div>
              )}
            </div>
          ) : (
            <div className="keepsake-detail">
              <div className="keepsake-chat-list">
                {selectedKeepsake.messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div className={`keepsake-message-row${isUser ? " is-user" : ""}`} key={message.id}>
                      <span className={getAvatarClassName(isUser ? "user" : "assistant", "keepsake-mini-avatar")}>
                        <AvatarImageContent
                          image={isUser ? avatarImages.user : avatarImages.assistant}
                          name={isUser ? displayNames.user : displayNames.assistant}
                          opacity={isUser ? avatarOpacities.user : avatarOpacities.assistant}
                        />
                      </span>
                      <div className="keepsake-message-stack">
                        <div className="keepsake-message-bubble">{message.content}</div>
                        <time>{formatKeepsakeTime(message.createdAt)}</time>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}
      {chatSpaceDrawerOpen && (
        <div className="chat-space-drawer-layer" role="presentation" onClick={() => setChatSpaceDrawerOpen(false)}>
          <aside className="chat-space-drawer" aria-label="聊天窗口" onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <strong>聊天窗口</strong>
                <span>左滑聊天区也可以打开这里</span>
              </div>
              <button type="button" onClick={() => setChatSpaceDrawerOpen(false)} aria-label="关闭聊天窗口抽屉">
                ×
              </button>
            </header>
            <div className="chat-space-list">
              {CHAT_SPACES.map((space) => (
                <button
                  className={space.id === activeChatSpaceId ? "is-active" : ""}
                  type="button"
                  key={space.id}
                  onClick={() => switchChatSpace(space.id)}
                  disabled={typing || isSending}
                >
                  <span>{space.eyebrow}</span>
                  <strong>{space.label}</strong>
                  <small>{space.detail}</small>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
      {historyOpen && <ChatHistoryOverlay onClose={() => setHistoryOpen(false)} displayNames={displayNames} avatarImages={avatarImages} avatarOpacities={avatarOpacities} />}
      {characterSettingsOpen && (
        <CharacterModelSettings
          characterId={characterId}
          onSaved={onCharacterSettingsSaved}
          onClose={() => setCharacterSettingsOpen(false)}
        />
      )}
      <MemoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </section>
  );
}
