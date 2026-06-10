/**
 * OpenAI-compatible Text-to-Speech via /audio/speech endpoint.
 * Works with ZenMux, OpenAI, and any中转站 that supports the standard OpenAI TTS format.
 */

const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

export function getOpenAIVoices() {
  return OPENAI_VOICES.map((id) => ({
    voice_id: id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
  }));
}

/**
 * @param {object} options
 * @param {string} options.text
 * @param {string} options.apiKey
 * @param {string} options.baseUrl
 * @param {string} options.voiceId - alloy/echo/fable/onyx/nova/shimmer
 * @param {string} [options.model='tts-1'] - tts-1 or tts-1-hd
 * @param {number} [options.speed=1.0]
 * @param {AbortSignal} [options.signal]
 */
export async function openaiTextToSpeech({
  text,
  apiKey,
  baseUrl,
  voiceId = "alloy",
  model = "tts-1",
  speed = 1.0,
  signal,
}) {
  if (!apiKey) return { error: "缺少 API Key" };
  if (!baseUrl) return { error: "缺少 Base URL" };
  if (!text?.trim()) return { error: "文本为空" };

  const url = `${String(baseUrl).replace(/\/+$/, "")}/audio/speech`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text.trim(),
        voice: voiceId,
        speed: Number(speed),
        response_format: "mp3",
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      let message = `TTS error ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        message = parsed.error?.message || parsed.detail || message;
      } catch {}
      return { error: message };
    }

    const audioBlob = await response.blob();
    return { audioBlob };
  } catch (err) {
    if (err.name === "AbortError") return { error: "请求已取消" };
    return { error: `网络错误: ${err.message}` };
  }
}
