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

export async function generateImage({ prompt, settings, signal }) {
  // Use independent image provider if configured, otherwise fall back to chat provider
  const apiKey = settings.imageApiKey || settings.apiKey;
  const baseUrl = settings.imageBaseUrl || settings.baseUrl;
  const model = settings.imageModel || settings.model || "openai/gpt-image-2";

  if (!apiKey) throw new Error("缺少 API Key");
  if (!baseUrl) throw new Error("缺少 Base URL");

  const url = `${normalizeBaseUrl(baseUrl)}/images/generations`;

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
    }),
  });

  const data = await readResponseJson(response);

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const imageUrl = data?.data?.[0]?.url || data?.data?.[0]?.b64_json || "";
  if (!imageUrl) throw new Error("接口未返回图片");

  // If it's a URL (not base64), fetch and convert to data URL for offline persistence
  if (imageUrl.startsWith("http")) {
    const imgResponse = await fetch(imageUrl);
    const blob = await imgResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("图片转换失败"));
      reader.readAsDataURL(blob);
    });
  }

  return imageUrl;
}
