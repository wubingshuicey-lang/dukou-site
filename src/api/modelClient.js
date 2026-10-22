import { callOpenAICompatible } from "./providers/openaiCompatible.js";
import { callAnthropic } from "./providers/anthropic.js";
import { getModelSettings } from "../store/settings.js";

const EMPTY_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

export function normalizeModelError(error) {
  const message = String(error?.message || error || "unknown");
  const status = Number(error?.status || 0);
  if (/缺少/i.test(message)) {
    return { type: "config", message };
  }
  // Worker 登录态过期时保留原文提示，而不是误导用户去改 API Key
  if (/登录|login|expired/i.test(message)) {
    return { type: "auth", message };
  }
  if (status === 404 || /invalid.?model|model.*not.?found/i.test(message)) {
    return { type: "config", message: message || "模型名不对" };
  }
  if (status === 401 || status === 403 || /401|403|unauthorized|invalid api key|api key/i.test(message)) {
    return { type: "auth", message: "API key 可能不对" };
  }
  if (status === 429 || /429|rate limit|too many requests/i.test(message)) {
    return { type: "rate_limit", message: "请求太快了" };
  }
  if (/timeout|aborted/i.test(message)) {
    return { type: "timeout", message: "请求超时" };
  }
  if (status === 502 || /502|unreachable|连不上|网关/i.test(message)) {
    return { type: "gateway_error", message: message || "网关暂时不可用" };
  }
  if (/network|fetch failed|failed to fetch/i.test(message)) {
    return { type: "network", message: "网络断了一下" };
  }
  return { type: "unknown", message: message || "模型请求失败" };
}

export async function callModel({ messages, systemPrompt, settings = getModelSettings(), signal, extraBody }) {
  try {
    const result =
      settings.apiStyle === "anthropic"
        ? await callAnthropic({ messages, systemPrompt, settings, signal })
        : await callOpenAICompatible({ messages, systemPrompt, settings, signal, extraBody });

    return {
      ok: true,
      text: result.text,
      reasoningContent: result.reasoningContent || "",
      reasoningSource: result.reasoningSource,
      usage: result.usage || EMPTY_USAGE,
      toolCalls: result.toolCalls || [],
    };
  } catch (error) {
    return {
      ok: false,
      text: "",
      reasoningContent: "",
      reasoningSource: undefined,
      usage: EMPTY_USAGE,
      toolCalls: [],
      error: normalizeModelError(error),
    };
  }
}
