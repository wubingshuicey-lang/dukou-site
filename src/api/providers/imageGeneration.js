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

  // Try common response formats: OpenAI, Gemini, etc.
  let imageUrl = data?.data?.[0]?.url
    || data?.data?.[0]?.b64_json
    || data?.generated_images?.[0]?.image
    || data?.images?.[0]
    || "";

  // Some APIs return image bytes as base64 in a nested object
  if (!imageUrl && data?.generatedImages) {
    imageUrl = data.generatedImages[0]?.image || data.generatedImages[0]?.url || "";
  }

  if (!imageUrl) {
    const preview = JSON.stringify(data).slice(0, 500);
    throw new Error(`接口未返回图片。响应: ${preview}`);
  }

  // If it's already a base64 data URL, return as-is
  if (imageUrl.startsWith("data:")) return imageUrl;

  // If it's a URL, fetch and convert to data URL
  if (imageUrl.startsWith("http")) {
    try {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) throw new Error(`HTTP ${imgResponse.status}`);
      const blob = await imgResponse.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("图片转换失败"));
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      // If we can't fetch the URL, try using it directly
      throw new Error(`图片下载失败: ${e.message}. URL: ${imageUrl.slice(0, 100)}`);
    }
  }

  // Raw base64 without prefix — add the prefix
  return `data:image/png;base64,${imageUrl}`;
}
