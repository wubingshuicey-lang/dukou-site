/**
 * Speech-to-Text service.
 * Mobile-first: tries browser Web Speech API first (fast, free),
 * falls back to MediaRecorder + API transcription for reliability.
 */

// ---- Web Speech API (fast path) ----

let recognition = null;

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}

function startWebSpeech(options = {}) {
  return new Promise((resolve) => {
    const recog = getRecognition();
    if (!recog) {
      resolve({ text: "", error: "浏览器不支持语音识别" });
      return;
    }

    recog.lang = options.lang || "zh-CN";
    recog.continuous = options.continuous || false;
    recog.interimResults = options.interimResults || false;

    let finalText = "";

    recog.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
    };

    recog.onerror = (event) => {
      if (event.error === "no-speech") {
        resolve({ text: "", error: "未检测到语音" });
      } else if (event.error === "aborted") {
        resolve({ text: finalText || "" });
      } else if (event.error === "not-allowed") {
        resolve({ text: "", error: "请允许麦克风权限" });
      } else {
        resolve({ text: finalText, error: `语音识别错误: ${event.error}` });
      }
      recognition = null;
    };

    recog.onend = () => {
      recognition = null;
      resolve({ text: finalText });
    };

    recognition = recog;
    recog.start();
  });
}

export function stopListening() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

// ---- MediaRecorder path (mobile-reliable) ----

let mediaRecorder = null;
let audioChunks = [];

async function startRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  // Prefer formats with wide mobile support
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
  mediaRecorder.start();
  return mediaRecorder;
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) { resolve(null); return; }
    mediaRecorder.onstop = () => {
      // Stop all tracks
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      if (audioChunks.length === 0) { resolve(null); return; }
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      resolve(blob);
    };
    mediaRecorder.stop();
  });
}

// ---- Main export: always uses MediaRecorder for mobile reliability ----

/**
 * Start listening. Uses MediaRecorder (works on iOS Safari, Android Chrome, desktop).
 * @param {object} options
 * @param {function} [options.onInterim] - called with partial text during recording
 * @returns {{ stop: () => Promise<{text: string, error?: string}>, cancel: () => void }}
 */
export function startListening(options = {}) {
  // Detect if we're on a platform where Web Speech works well (desktop Chrome/Edge)
  const isChromium = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isDesktop = !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // On desktop Chromium, use fast Web Speech API
  if (isChromium && isDesktop) {
    let resolved = false;
    const promise = startWebSpeech(options);
    return {
      stop: () => {
        stopListening();
        return promise;
      },
      cancel: () => {
        stopListening();
        resolved = true;
      },
    };
  }

  // On mobile or non-Chromium: use MediaRecorder — more reliable
  let cancelled = false;
  let recorder = null;

  const stop = async () => {
    if (cancelled) return { text: "" };
    const blob = await stopRecording();
    if (!blob || cancelled) return { text: "" };

    // Convert to base64 for API
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        resolve(result.split(",")[1] || "");
      };
      reader.readAsDataURL(blob);
    });

    if (!base64) return { text: "", error: "录音数据为空" };

    // Send to API for transcription
    try {
      const { getModelSettings } = await import("../store/settings.js");
      const settings = getModelSettings();
      if (!settings.apiKey) return { text: "", error: "请先设置 API Key" };

      const baseUrl = (settings.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
      const resp = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${settings.apiKey}` },
        body: (() => {
          const fd = new FormData();
          const ext = (blob.type || "").includes("mp4") ? "mp4" : "webm";
          fd.append("file", blob, `recording.${ext}`);
          fd.append("model", "whisper-1");
          fd.append("language", "zh");
          return fd;
        })(),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error?.message || "转写失败");
      return { text: data.text || "" };
    } catch (err) {
      return { text: "", error: err.message || "语音转写失败" };
    }
  };

  const cancel = () => {
    cancelled = true;
    stopRecording().catch(() => {});
  };

  // Start recording immediately
  startRecording().then((rec) => { recorder = rec; }).catch((err) => {
    cancelled = true;
  });

  return { stop, cancel };
}

/** Check browser support */
export function supportsSTT() {
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
}
