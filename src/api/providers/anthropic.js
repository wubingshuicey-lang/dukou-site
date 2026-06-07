function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "https://api.anthropic.com").replace(/\/+$/, "");
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function callAnthropic({ messages, systemPrompt, settings, signal }) {
  if (!settings?.apiKey) throw new Error("缺少 Claude API Key");
  if (!settings?.model) throw new Error("缺少 Claude 模型名");

  const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/v1/messages`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: Number(settings.maxTokens ?? 1000),
      temperature: Number(settings.temperature ?? 0.8),
      system: systemPrompt,
      messages,
    }),
  });

  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || `Claude 请求失败 ${response.status}`);
  }

  const contentBlocks = Array.isArray(data?.content) ? data.content : [];
  const thinkingText = contentBlocks
    .filter((block) => block.type === "thinking" && typeof block.thinking === "string")
    .map((block) => block.thinking)
    .join("\n")
    .trim();

  return {
    text: contentBlocks
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(""),
    reasoningContent: thinkingText,
    reasoningSource: thinkingText ? "claude_thinking_block" : undefined,
    usage: {
      inputTokens: data?.usage?.input_tokens ?? 0,
      outputTokens: data?.usage?.output_tokens ?? 0,
      totalTokens: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
      cacheReadTokens: data?.usage?.cache_read_input_tokens ?? 0,
      cacheWriteTokens: data?.usage?.cache_creation_input_tokens ?? 0,
    },
    toolCalls: contentBlocks.filter((block) => block.type === "tool_use"),
    raw: data,
  };
}
