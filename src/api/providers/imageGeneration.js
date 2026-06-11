function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function extractImage(data) {
  // OpenAI format
  if (data?.data?.[0]?.b64_json) return { type: "b64", value: data.data[0].b64_json };
  if (data?.data?.[0]?.url) return { type: "url", value: data.data[0].url };
  // Gemini / Vertex format
  if (data?.generated_images?.[0]?.image) return { type: "b64", value: data.generated_images[0].image };
  if (data?.generatedImages?.[0]?.image) return { type: "b64", value: data.generatedImages[0].image };
  if (data?.generatedImages?.[0]?.url) return { type: "url", value: data.generatedImages[0].url };
  // Flat array
  if (data?.images?.[0]) {
    const img = data.images[0];
    if (typeof img === "string") return { type: img.startsWith("http") ? "url" : "b64", value: img };
    return { type: img.url ? "url" : "b64", value: img.url || img.b64_json || img.image || "" };
  }
  // Root-level string
  if (typeof data === "string" && data.length > 100) return { type: "b64", value: data };
  return null;
}

export async function generateImage({ prompt, settings, signal }) {
  const apiKey = settings.imageApiKey || settings.apiKey;
  const baseUrl = settings.imageBaseUrl || settings.baseUrl;
  const model = settings.imageModel || settings.model || "openai/gpt-image-2";

  if (!apiKey) throw new Error("缺少 API Key");
  if (!baseUrl) throw new Error("缺少 Base URL");

  const url = `${normalizeBaseUrl(baseUrl)}/images/generations`;

  // Try b64_json first (avoids URL download issues)
  for (const fmt of ["b64_json", "url"]) {
    try {
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
          response_format: fmt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data?.error?.message || data?.message || `HTTP ${response.status}`;
        // If b64_json not supported, try url format next
        if (fmt === "b64_json" && (response.status === 400 || msg.includes("format"))) continue;
        throw new Error(msg);
      }

      const extracted = extractImage(data);
      if (!extracted) {
        if (fmt === "b64_json") continue; // try url format
        const preview = JSON.stringify(data).slice(0, 400);
        throw new Error(`接口未返回图片。响应: ${preview}`);
      }

      if (extracted.type === "b64") return `data:image/png;base64,${extracted.value}`;
      if (extracted.type === "url") {
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
    } catch (err) {
      // If first attempt failed non-fatally, let the loop continue
      if (fmt === "b64_json" && err.message.includes("未返回图片")) continue;
      throw err;
    }
  }

  throw new Error("生图失败：所有格式均未返回图片");
}
