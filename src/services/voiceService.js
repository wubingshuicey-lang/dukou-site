import { getElevenlabsSettings } from "../store/settings.js";
import { textToSpeech } from "../api/providers/elevenlabs.js";

let currentAudio = null;
let currentAbort = null;

/**
 * Speak text using ElevenLabs TTS.
 * Auto-stops any currently playing audio.
 * @param {string} text
 * @param {object} [overrides]
 * @param {string} [overrides.voiceId] - Override the default voice ID
 * @param {string} [overrides.apiKey]
 */
export async function speak(text, overrides = {}) {
  // Stop any current playback
  stopSpeaking();

  const settings = getElevenlabsSettings();
  const apiKey = overrides.apiKey || settings.apiKey;
  const voiceId = overrides.voiceId || settings.voiceId;

  if (!apiKey || !voiceId) {
    console.warn("ElevenLabs: 缺少 API Key 或 Voice ID，请在设置中配置");
    return { error: "请先在设置中配置 ElevenLabs API Key 和 Voice ID" };
  }

  const controller = new AbortController();
  currentAbort = controller;

  const result = await textToSpeech({
    text,
    apiKey,
    voiceId,
    stability: settings.stability,
    similarityBoost: settings.similarityBoost,
    signal: controller.signal,
  });

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
