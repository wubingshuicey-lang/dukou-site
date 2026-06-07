function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function callOpenAICompatible({ messages, systemPrompt, settings, signal }) {
  if (!settings?.apiKey) throw new Error("缺少 API Key");
  if (!settings?.baseUrl) throw new Error("缺少 Base URL");
  if (!settings?.model) throw new Error("缺少模型名");

  const url = `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: Number(settings.temperature ?? 0.8),
      max_tokens: Number(settings.maxTokens ?? 1000),
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  const data = await readResponseJson(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `模型请求失败 ${response.status}`);
  }

  return {
    text: data?.choices?.[0]?.message?.content || "",
    reasoningContent: data?.choices?.[0]?.message?.reasoning_content || "",
    reasoningSource: data?.choices?.[0]?.message?.reasoning_content ? "deepseek_reasoning_content" : undefined,
    usage: {
      inputTokens: data?.usage?.prompt_tokens ?? 0,
      outputTokens: data?.usage?.completion_tokens ?? 0,
      totalTokens: data?.usage?.total_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    toolCalls: [],
    raw: data,
  };
}
