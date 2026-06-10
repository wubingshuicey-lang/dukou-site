const BASE_URL = "https://api.elevenlabs.io/v1";

/**
 * Convert text to speech using ElevenLabs API.
 * @param {object} options
 * @param {string} options.text - Text to speak
 * @param {string} options.apiKey - ElevenLabs API key
 * @param {string} options.voiceId - ElevenLabs voice ID
 * @param {number} [options.stability=0.5] - Voice stability (0-1)
 * @param {number} [options.similarityBoost=0.75] - Similarity boost (0-1)
 * @param {AbortSignal} [options.signal] - Abort signal for cancellation
 * @returns {Promise<{audioBlob: Blob, error?: string}>}
 */
export async function textToSpeech({
  text,
  apiKey,
  voiceId,
  stability = 0.5,
  similarityBoost = 0.75,
  signal,
}) {
  if (!apiKey) return { error: "缺少 ElevenLabs API Key" };
  if (!voiceId) return { error: "缺少 Voice ID" };
  if (!text?.trim()) return { error: "文本为空" };

  const url = `${BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: Number(stability),
          similarity_boost: Number(similarityBoost),
        },
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      let message = `ElevenLabs error ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        message = parsed.detail?.message || parsed.detail || message;
      } catch {}
      return { error: message };
    }

    const audioBlob = await response.blob();
    return { audioBlob };
  } catch (err) {
    if (err.name === "AbortError") {
      return { error: "请求已取消" };
    }
    return { error: `网络错误: ${err.message}` };
  }
}

/**
 * Fetch available voices from ElevenLabs.
 * @param {string} apiKey
 * @returns {Promise<{voices?: Array<{voice_id: string, name: string}>, error?: string}>}
 */
export async function getVoices(apiKey) {
  if (!apiKey) return { error: "缺少 API Key" };

  try {
    const response = await fetch(`${BASE_URL}/voices`, {
      headers: { "xi-api-key": apiKey },
    });

    if (!response.ok) {
      return { error: `获取声音列表失败 (${response.status})` };
    }

    const data = await response.json();
    return {
      voices: (data.voices || []).map((v) => ({
        voice_id: v.voice_id,
        name: v.name,
      })),
    };
  } catch (err) {
    return { error: `网络错误: ${err.message}` };
  }
}
