/**
 * Speech-to-Text service.
 * Primary: MediaRecorder → API 中转站 /audio/transcriptions (OpenAI Whisper format)
 * Fallback: browser Web Speech API
 */

// ---- MediaRecorder (primary) ----

let mediaRecorder = null;
let audioChunks = [];

async function startRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!mediaRecorder) { resolve(null); return; }
    mediaRecorder.onstop = () => {
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      if (audioChunks.length === 0) { resolve(null); return; }
      resolve(new Blob(audioChunks, { type: mediaRecorder.mimeType }));
    };
    mediaRecorder.stop();
  });
}

async function transcribeViaApi(blob) {
  const { getModelSettings } = await import("../store/settings.js");
  const settings = getModelSettings();
  if (!settings.apiKey) return { text: "", error: "请先在设置里填写 API Key" };

  const baseUrl = (settings.baseUrl || "").replace(/\/+$/, "");
  if (!baseUrl) return { text: "", error: "请先在设置里填写接口地址 (Base URL)" };

  const ext = (blob.type || "").includes("mp4") ? "mp4" : "webm";
  const fd = new FormData();
  fd.append("file", blob, `recording.${ext}`);
  const sttModel = settings.sttModel || "whisper-1";
  fd.append("model", sttModel);
  fd.append("language", "zh");

  const resp = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.apiKey}` },
    body: fd,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data?.error?.message || data?.error?.msg || `HTTP ${resp.status}`;
    return { text: "", error: `转写失败: ${msg}` };
  }
  return { text: (data.text || "").trim() };
}

// ---- Web Speech API (fallback) ----

let recognition = null;

function getRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "zh-CN";
  r.continuous = true;
  r.interimResults = true;
  return r;
}

function startWebSpeech() {
  const recog = getRecognition();
  if (!recog) {
    return { stop: async () => ({ text: "", error: "浏览器不支持语音识别" }), cancel: () => {} };
  }

  let finalText = "";
  let resolved = false;
  const deferred = {};
  deferred.promise = new Promise((r) => { deferred.resolve = r; });

  recog.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
    }
  };

  recog.onerror = (event) => {
    if (resolved || event.error === "no-speech") return;
    resolved = true;
    recognition = null;
    if (event.error === "aborted") deferred.resolve({ text: finalText.trim() });
    else if (event.error === "not-allowed") deferred.resolve({ text: "", error: "请允许麦克风权限" });
    else deferred.resolve({ text: finalText.trim(), error: `识别错误: ${event.error}` });
  };

  recog.onend = () => {
    if (resolved) return;
    resolved = true;
    recognition = null;
    deferred.resolve({ text: finalText.trim() });
  };

  recognition = recog;
  recog.start();

  return {
    stop: () => { recognition?.stop(); recognition = null; return deferred.promise; },
    cancel: () => { recognition?.abort(); recognition = null; resolved = true; deferred.resolve({ text: "" }); },
  };
}

// ---- Main ----

/**
 * Start listening. Returns { stop, cancel }.
 * Primary path: MediaRecorder → API /audio/transcriptions
 * Fallback: Web Speech API (if mic permission denied or browser doesn't support MediaRecorder)
 */
export function startListening() {
  // Try MediaRecorder first
  const hasMediaRecorder = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!hasMediaRecorder) return startWebSpeech();

  let cancelled = false;
  let started = false;

  startRecording().then(() => { started = true; }).catch((err) => {
    // Mic permission denied or error — don't try fallback here, just mark as failed
    cancelled = true;
  });

  return {
    stop: async () => {
      if (cancelled) return { text: "", error: "麦克风启动失败，请检查权限" };
      if (!started) {
        // Still starting, wait a bit
        await new Promise((r) => setTimeout(r, 200));
        if (!started) return { text: "", error: "麦克风未就绪，请重试" };
      }
      const blob = await stopRecording();
      if (!blob || blob.size < 100) return { text: "", error: "录音太短，请按住说话" };
      return transcribeViaApi(blob);
    },
    cancel: () => {
      cancelled = true;
      stopRecording().catch(() => {});
    },
  };
}

export function stopListening() {
  if (recognition) { recognition.stop(); recognition = null; }
}

export function supportsSTT() {
  return !!(
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) ||
    window.SpeechRecognition ||
    window.webkitSpeechRecognition
  );
}
