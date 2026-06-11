function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function extractImage(data) {
  if (data?.data?.[0]?.url) return { type: "url", value: data.data[0].url };
  if (data?.data?.[0]?.b64_json) return { type: "b64", value: data.data[0].b64_json };
  if (data?.generated_images?.[0]?.image) return { type: "b64", value: data.generated_images[0].image };
  if (data?.generatedImages?.[0]?.image) return { type: "b64", value: data.generatedImages[0].image };
  if (data?.generatedImages?.[0]?.url) return { type: "url", value: data.generatedImages[0].url };
  if (typeof data === "string" && data.length > 100) return { type: "b64", value: data };
  return null;
}

export async function generateImage({ prompt, settings, signal }) {
  const apiKey = settings.imageApiKey || settings.apiKey;
  const baseUrl = settings.imageBaseUrl || settings.baseUrl;
  const model = settings.imageModel || settings.model || "google/gemini-2.5-flash-image";

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
    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024" }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const extracted = extractImage(data);
  if (!extracted) {
    const preview = JSON.stringify(data).slice(0, 400);
    throw new Error(`接口未返回图片。响应: ${preview}`);
  }

  if (extracted.type === "b64") return `data:image/png;base64,${extracted.value}`;

  // URL: fetch and convert to data URL
  try {
    const imgResponse = await fetch(extracted.value);
    if (!imgResponse.ok) throw new Error(`HTTP ${imgResponse.status}`);
    const blob = await imgResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("图片转换失败"));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    throw new Error(`图片下载失败: ${e.message}`);
  }
}
