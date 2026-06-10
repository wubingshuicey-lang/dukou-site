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

function buildMessageContent(message) {
  // If the message has an image, build multimodal content array
  if (message.imageUrl) {
    const parts = [];
    if (message.imageUrl) {
      parts.push({
        type: "image_url",
        image_url: { url: message.imageUrl },
      });
    }
    if (message.content) {
      parts.push({ type: "text", text: message.content });
    }
    return parts;
  }
  return message.content;
}

export async function callOpenAICompatible({ messages, systemPrompt, settings, signal }) {
  if (!settings?.apiKey) throw new Error("缺少 API Key");
  if (!settings?.baseUrl) throw new Error("缺少 Base URL");
  if (!settings?.model) throw new Error("缺少模型名");

  const url = `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`;

  // Convert messages to API format, handling multimodal content
  const apiMessages = messages.map((m) => ({
    role: m.role,
    content: buildMessageContent(m),
  }));

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
      messages: [{ role: "system", content: systemPrompt }, ...apiMessages],
    }),
  });

  const data = await readResponseJson(response);
  if (!response.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
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
