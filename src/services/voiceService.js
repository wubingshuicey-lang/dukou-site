import { getElevenlabsSettings, getModelSettings } from "../store/settings.js";
import { textToSpeech as elevenlabsTts } from "../api/providers/elevenlabs.js";
import { openaiTextToSpeech } from "../api/providers/openaiTts.js";

let currentAudio = null;
let currentAbort = null;

/**
 * Speak text using configured TTS provider.
 * Supports: ElevenLabs, OpenAI TTS (/audio/speech), or any OpenAI-compatible TTS.
 * Auto-stops any currently playing audio.
 */
export async function speak(text, overrides = {}) {
  stopSpeaking();

  const controller = new AbortController();
  currentAbort = controller;

  // Determine provider: if ElevenLabs settings have apiKey, use that; otherwise try OpenAI TTS
  const elevenSettings = getElevenlabsSettings();
  const modelSettings = getModelSettings();

  const ttsProvider = overrides.provider || elevenSettings.provider || "elevenlabs";
  let result;

  if (ttsProvider === "openai") {
    // OpenAI-compatible TTS: uses global LLM settings (key + baseUrl)
    const apiKey = overrides.apiKey || modelSettings.apiKey;
    const baseUrl = overrides.baseUrl || modelSettings.baseUrl;
    const voiceId = overrides.voiceId || elevenSettings.voiceId || "alloy";

    if (!apiKey) {
      return { error: "请先在设置里填写 API Key" };
    }

    result = await openaiTextToSpeech({
      text,
      apiKey,
      baseUrl,
      voiceId,
      model: elevenSettings.openaiModel || "tts-1",
      speed: elevenSettings.speed || 1.0,
      signal: controller.signal,
    });
  } else {
    // ElevenLabs (default)
    const apiKey = overrides.apiKey || elevenSettings.apiKey;
    const voiceId = overrides.voiceId || elevenSettings.voiceId;

    if (!apiKey || !voiceId) {
      return { error: "请先在设置中配置 ElevenLabs API Key 和 Voice ID" };
    }

    result = await elevenlabsTts({
      text,
      apiKey,
      voiceId,
      stability: elevenSettings.stability,
      similarityBoost: elevenSettings.similarityBoost,
      signal: controller.signal,
    });
  }

  if (result.error) {
    currentAbort = null;
    return result;
  }

  const audioUrl = URL.createObjectURL(result.audioBlob);
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
    currentAbort = null;
  };

  audio.onerror = () => {
    URL.revokeObjectURL(audioUrl);
    currentAudio = null;
    currentAbort = null;
  };

  await audio.play();
  return {};
}

/** Stop any currently playing TTS audio. */
export function stopSpeaking() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/** Check if audio is currently playing. */
export function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused;
}
