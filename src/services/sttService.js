/**
 * Browser-based Speech-to-Text using Web Speech API.
 * Works in Chrome, Edge, and most modern browsers.
 * Supports Chinese (zh-CN) by default.
 */

let recognition = null;

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}

/**
 * Start listening and return transcribed text.
 * @param {object} options
 * @param {string} [options.lang='zh-CN']
 * @param {boolean} [options.continuous=false]
 * @param {boolean} [options.interimResults=false]
 * @returns {Promise<{text: string, error?: string}>}
 */
export function startListening(options = {}) {
  return new Promise((resolve) => {
    const recog = getRecognition();
    if (!recog) {
      resolve({ text: "", error: "浏览器不支持语音识别，请使用 Chrome 或 Edge" });
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

/** Stop current listening session. */
export function stopListening() {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

/** Check if browser supports STT. */
export function supportsSTT() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
