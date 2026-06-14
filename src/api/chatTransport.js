import { callModel } from "./modelClient.js";
import { chatViaGateway } from "./apiClient.js";
import { PROVIDER_PRESETS, getModelSettings, getTransportSettings } from "../store/settings.js";

const EMPTY_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const KIWI_LOCAL_PLACEHOLDER_KEY = "dukou-kiwi-local";

export function normalizeChatTransport(value) {
  return ["mock", "direct_model", "kiwi_direct", "backend_gateway"].includes(value) ? value : "mock";
}

export function isPlaceholderChatTransport(value) {
  return false; // backend_gateway 已实现，不再是占位
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

  if (chatTransport === "backend_gateway") {
    try {
      const result = await chatViaGateway({
        messages,
        chatSpaceId: transportSettings?.chatSpaceId || "main",
        systemPrompt,
        model: modelSettings?.model || "gpt-4o",
        maxTokens: modelSettings?.maxTokens,
        temperature: modelSettings?.temperature,
        signal,
      });
      return {
        ok: true,
        text: result.text,
        reasoningContent: result.reasoningContent || "",
        reasoningSource: undefined,
        usage: result.usage || EMPTY_USAGE,
        transport: chatTransport,
      };
    } catch (error) {
      return {
        ok: false,
        text: "",
        reasoningContent: "",
        reasoningSource: undefined,
        usage: EMPTY_USAGE,
        transport: chatTransport,
        error: { type: "gateway_error", message: error.message },
      };
    }
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
      message: `未知的 chatTransport: ${chatTransport}`,
    },
  };
}
