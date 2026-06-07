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
  if (/缺少/i.test(message)) {
    return { type: "config", message };
  }
  if (/401|403|unauthorized|invalid api key|api key/i.test(message)) {
    return { type: "auth", message: "API key 可能不对" };
  }
  if (/429|rate limit|too many requests/i.test(message)) {
    return { type: "rate_limit", message: "请求太快了" };
  }
  if (/timeout|aborted/i.test(message)) {
    return { type: "timeout", message: "请求超时" };
  }
  if (/network|fetch failed|failed to fetch/i.test(message)) {
    return { type: "network", message: "网络断了一下" };
  }
  return { type: "unknown", message: "模型请求失败" };
}

export async function callModel({ messages, systemPrompt, settings = getModelSettings(), signal }) {
  try {
    const result =
      settings.apiStyle === "anthropic"
        ? await callAnthropic({ messages, systemPrompt, settings, signal })
        : await callOpenAICompatible({ messages, systemPrompt, settings, signal });

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
