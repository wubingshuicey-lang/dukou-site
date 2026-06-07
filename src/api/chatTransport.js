import { callModel } from "./modelClient.js";
import { PROVIDER_PRESETS, getModelSettings, getTransportSettings } from "../store/settings.js";

const EMPTY_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const PLACEHOLDER_MESSAGES = {
  backend_gateway: "backend_gateway 目前只是未来后端占位。本轮没有 Node / Express 网关请求。",
};

const KIWI_LOCAL_PLACEHOLDER_KEY = "dukou-kiwi-local";

export function normalizeChatTransport(value) {
  return ["mock", "direct_model", "kiwi_direct", "backend_gateway"].includes(value) ? value : "mock";
}

export function isPlaceholderChatTransport(value) {
  const chatTransport = normalizeChatTransport(value);
  return chatTransport === "backend_gateway";
}

export function getChatTransportLabel(value) {
  const chatTransport = normalizeChatTransport(value);
  return {
    mock: "mock",
    direct_model: "direct_model",
    kiwi_direct: "kiwi_direct",
    backend_gateway: "backend_gateway",
  }[chatTransport];
}

export async function sendChatRequest({
  messages,
  systemPrompt,
  modelSettings = getModelSettings(),
  transportSettings = getTransportSettings(),
  signal,
  mockText = "我在。<split>本地 mock 可以跑。",
}) {
  const chatTransport = normalizeChatTransport(transportSettings?.chatTransport);

  if (chatTransport === "mock") {
    return {
      ok: true,
      text: mockText,
      reasoningContent: "",
      reasoningSource: undefined,
      usage: EMPTY_USAGE,
      transport: chatTransport,
    };
  }

  if (chatTransport === "direct_model") {
    return callModel({ messages, systemPrompt, settings: modelSettings, signal });
  }

  if (chatTransport === "kiwi_direct") {
    const kiwiPreset = PROVIDER_PRESETS.kiwi_local;
    const usesKiwiLocal = modelSettings?.provider === "kiwi_local";
    return callModel({
      messages,
      systemPrompt,
      settings: {
        ...modelSettings,
        provider: "kiwi_local",
        apiStyle: "openai_compatible",
        baseUrl: usesKiwiLocal ? modelSettings.baseUrl || kiwiPreset.baseUrl : kiwiPreset.baseUrl,
        model: usesKiwiLocal ? modelSettings.model || kiwiPreset.defaultModel : kiwiPreset.defaultModel,
        apiKey: KIWI_LOCAL_PLACEHOLDER_KEY,
      },
      signal,
    });
  }

  return {
    ok: false,
    text: "",
    reasoningContent: "",
    reasoningSource: undefined,
    usage: EMPTY_USAGE,
    transport: chatTransport,
    error: {
      type: "not_implemented",
      message: PLACEHOLDER_MESSAGES[chatTransport],
    },
  };
}
