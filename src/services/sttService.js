/**
 * Speech-to-Text using browser Web Speech API.
 * Supported on Chrome (desktop+Android), Edge, Safari (iOS 14.5+, macOS).
 */

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

/**
 * Start listening. Returns controller with stop/cancel.
 * Call .stop() to finish and get transcribed text.
 */
export function startListening() {
  const recog = getRecognition();
  if (!recog) {
    return {
      stop: async () => ({ text: "", error: "浏览器不支持语音识别，请用 Chrome 或 Edge" }),
      cancel: () => {},
    };
  }

  let finalText = "";
  let interimText = "";
  let resolved = false;

  const deferred = {};
  deferred.promise = new Promise((resolve) => { deferred.resolve = resolve; });

  recog.onresult = (event) => {
    interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += t;
      } else {
        interimText += t;
      }
    }
  };

  recog.onerror = (event) => {
    if (resolved) return;
    if (event.error === "no-speech") {
      // Don't error on no-speech during continuous listening
      return;
    }
    resolved = true;
    recognition = null;
    if (event.error === "aborted") {
      deferred.resolve({ text: finalText.trim() });
    } else if (event.error === "not-allowed") {
      deferred.resolve({ text: "", error: "请允许麦克风权限后重试" });
    } else if (event.error === "network") {
      deferred.resolve({ text: finalText.trim(), error: "网络连接失败" });
    } else {
      deferred.resolve({ text: finalText.trim(), error: `识别失败: ${event.error}` });
    }
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
    stop: () => {
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
      return deferred.promise;
    },
    cancel: () => {
      if (recognition) {
        recognition.abort();
        recognition = null;
      }
      resolved = true;
      deferred.resolve({ text: "" });
    },
  };
}

export function stopListening() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

export function supportsSTT() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
