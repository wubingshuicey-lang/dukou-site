import { useState } from "react";
import { getCharacter, MODEL_PROVIDER_OPTIONS, updateCharacter } from "../store/characters.js";
import { getModelSettings } from "../store/settings.js";
import { callModel } from "../api/modelClient.js";
import { getVoices } from "../api/providers/elevenlabs.js";

function buildTestSettings({ provider, apiKey, modelName, baseUrl }) {
  const global = getModelSettings();
  const sel = MODEL_PROVIDER_OPTIONS.find((p) => p.id === provider);

  if (!provider || !sel) {
    return { ...global, apiKey: apiKey || global.apiKey };
  }

  return {
    provider,
    apiStyle: sel.apiStyle,
    apiKey: apiKey || "",
    baseUrl: baseUrl || sel.baseUrl || "",
    model: modelName || sel.defaultModel || "",
    temperature: global.temperature,
    maxTokens: global.maxTokens,
    outputMode: global.outputMode,
  };
}

export default function CharacterModelSettings({ characterId, onSaved, onClose }) {
  const char = getCharacter(characterId);

  const [provider, setProvider] = useState(char?.modelProvider || "");
  const [apiKey, setApiKey] = useState(char?.modelApiKey || "");
  const [modelName, setModelName] = useState(char?.modelName || "");
  const [baseUrl, setBaseUrl] = useState(char?.modelBaseUrl || "");
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState(char?.elevenlabsApiKey || "");
  const [voiceId, setVoiceId] = useState(char?.voiceId || "");
  const [voiceMode, setVoiceMode] = useState(char?.voiceMode || "off");
  const [sttEnabled, setSttEnabled] = useState(char?.sttEnabled || false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [fetchingVoices, setFetchingVoices] = useState(false);
  const [voiceList, setVoiceList] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [testingTts, setTestingTts] = useState(false);
  const [ttsResult, setTtsResult] = useState(null);

  const selectedProvider = MODEL_PROVIDER_OPTIONS.find((p) => p.id === provider);
  const needsApiKey = provider && provider !== "";
  const needsBaseUrl = provider !== "";
  const needsModelName = provider === "openrouter" || provider === "custom";

  async function testConnection() {
    setTesting(true);
    setTestResult(null);

    const settings = buildTestSettings({ provider, apiKey, modelName, baseUrl });
    const result = await callModel({
      messages: [{ role: "user", content: "你好，请回复一个字：通" }],
      systemPrompt: "你是一个连接测试。",
      settings,
    });

    setTesting(false);
    if (result.ok) {
      setTestResult({ ok: true, text: result.text.slice(0, 100) });
    } else {
      setTestResult({ ok: false, text: result.error?.message || "连接失败" });
    }
  }

  async function fetchVoices() {
    setFetchingVoices(true);
    setVoiceError("");
    setVoiceList(null);

    const elevenlabsKey = elevenlabsApiKey || char?.elevenlabsApiKey || "";
    if (!elevenlabsKey) {
      const { getElevenlabsSettings } = await import("../store/settings.js");
      const globalSettings = getElevenlabsSettings();
      if (!globalSettings.apiKey) {
        setVoiceError("请先在全局设置或此处填写 ElevenLabs API Key");
        setFetchingVoices(false);
        return;
      }
      const result = await getVoices(globalSettings.apiKey);
      if (result.error) {
        setVoiceError(result.error);
      } else {
        setVoiceList(result.voices);
      }
      setFetchingVoices(false);
      return;
    }

    const result = await getVoices(elevenlabsKey);
    if (result.error) {
      setVoiceError(result.error);
    } else {
      setVoiceList(result.voices);
    }
    setFetchingVoices(false);
  }

  async function testTts() {
    setTestingTts(true);
    setTtsResult(null);

    const ttsApiKey = elevenlabsApiKey || char?.elevenlabsApiKey || "";
    const ttsVoiceId = voiceId || char?.voiceId || "";
    if (!ttsApiKey) {
      setTtsResult({ ok: false, text: "请先填写 API Key" });
      setTestingTts(false);
      return;
    }
    if (!ttsVoiceId) {
      setTtsResult({ ok: false, text: "请先填写或选择 Voice ID" });
      setTestingTts(false);
      return;
    }

    try {
      const { speak } = await import("../services/voiceService.js");
      const { stopSpeaking } = await import("../services/voiceService.js");
      stopSpeaking();
      const result = await speak("你好，这是渡口的语音测试。", { apiKey: ttsApiKey, voiceId: ttsVoiceId });
      if (result?.error) {
        setTtsResult({ ok: false, text: result.error });
      } else {
        setTtsResult({ ok: true, text: "播放成功，请听声音" });
      }
    } catch (err) {
      setTtsResult({ ok: false, text: err.message || "TTS 测试失败" });
    }
    setTestingTts(false);
  }

  function handleSave() {
    updateCharacter(characterId, {
      modelProvider: provider,
      modelApiKey: apiKey,
      modelName: modelName,
      modelBaseUrl: baseUrl,
      elevenlabsApiKey,
      voiceId,
      voiceMode,
      ttsEnabled: voiceMode !== "off",
      sttEnabled,
    });
    onSaved();
    onClose();
  }

  const voiceModeLabels = {
    off: "关闭语音",
    auto: "AI 自主",
  };
  const voiceModeOptions = ["off", "auto"];

  return (
    <div className="charm-overlay" onClick={onClose}>
      <div className="charm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="charm-header">
          <span className="charm-title">{char?.name || ""} 的模型设置</span>
          <button className="charm-close" onClick={onClose}>×</button>
        </div>

        <div className="charm-body">
          <div className="charm-section">
            <div className="charm-section-title">AI 模型</div>
            <p className="charm-section-desc">留空则使用全局设置</p>
            <div className="charm-chips">
              {MODEL_PROVIDER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`charm-chip ${provider === opt.id ? "selected" : ""}`}
                  onClick={() => {
                    setProvider(opt.id);
                    setModelName(opt.defaultModel || "");
                    setBaseUrl(opt.baseUrl || "");
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {needsApiKey && (
              <div className="charm-field">
                <label className="charm-label">API Key</label>
                <input
                  className="charm-input"
                  type="password"
                  placeholder={`输入 ${selectedProvider?.label || ""} 的 API Key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}

            {needsBaseUrl && (
              <div className="charm-field">
                <label className="charm-label">接口地址</label>
                <input
                  className="charm-input"
                  placeholder="https://your-api.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            )}

            {needsModelName && (
              <div className="charm-field">
                <label className="charm-label">模型名称</label>
                <input
                  className="charm-input"
                  placeholder="输入模型 ID"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
              </div>
            )}

            <div className="charm-field">
              <button
                className="charm-test-btn"
                type="button"
                onClick={testConnection}
                disabled={testing || (!provider && !apiKey)}
              >
                {testing ? "测试中..." : "测试连接"}
              </button>
              {testResult && (
                <div className={`charm-test-result ${testResult.ok ? "success" : "fail"}`}>
                  {testResult.ok ? `✓ 连接成功 — ${testResult.text}` : `✗ ${testResult.text}`}
                </div>
              )}
            </div>
          </div>

          <div className="charm-section">
            <div className="charm-section-title">语音配置</div>
            <p className="charm-section-desc">ElevenLabs TTS，留空则使用全局设置</p>

            <div className="charm-field">
              <label className="charm-label">ElevenLabs API Key</label>
              <input
                className="charm-input"
                type="password"
                placeholder="sk_...（独立于 LLM API Key）"
                value={elevenlabsApiKey}
                onChange={(e) => setElevenlabsApiKey(e.target.value)}
              />
            </div>

            <div className="charm-field">
              <label className="charm-label">语音模式</label>
              <div className="charm-chips">
                {voiceModeOptions.map((mode) => (
                  <button
                    key={mode}
                    className={`charm-chip ${voiceMode === mode ? "selected" : ""}`}
                    onClick={() => setVoiceMode(mode)}
                  >
                    {voiceModeLabels[mode]}
                  </button>
                ))}
              </div>
              <p className="charm-section-desc" style={{ marginTop: 4 }}>
                {voiceMode === "off" && "不使用语音"}
                {voiceMode === "auto" && "AI 自主决定是否发送语音气泡（在回复末尾加 [voice] 标记）"}
              </p>
            </div>

            <div className="charm-field">
              <label className="charm-label">Voice ID</label>
              <input
                className="charm-input"
                placeholder="例如 21m00Tcm4TlvDq8ikWAM"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              />
              <p className="charm-section-desc" style={{ marginTop: 2 }}>
                不是 API Key（sk_...），是声音 ID
              </p>
            </div>

            <div className="charm-field">
              <button
                className="charm-test-btn"
                type="button"
                onClick={fetchVoices}
                disabled={fetchingVoices}
              >
                {fetchingVoices ? "获取中..." : "获取可用声音列表"}
              </button>
              <button
                className="charm-test-btn"
                type="button"
                onClick={testTts}
                disabled={testingTts}
                style={{ marginLeft: 8 }}
              >
                {testingTts ? "测试中..." : "测试 TTS"}
              </button>
              {voiceError && (
                <div className="charm-test-result fail" style={{ marginTop: 6 }}>✗ {voiceError}</div>
              )}
              {ttsResult && (
                <div className={`charm-test-result ${ttsResult.ok ? "success" : "fail"}`} style={{ marginTop: 6 }}>
                  {ttsResult.ok ? `✓ ${ttsResult.text}` : `✗ ${ttsResult.text}`}
                </div>
              )}
              {voiceList && (
                <div className="voice-list" style={{ marginTop: 8, maxHeight: 160, overflow: "auto" }}>
                  {voiceList.map((v) => (
                    <button
                      key={v.voice_id}
                      type="button"
                      className={`charm-chip ${voiceId === v.voice_id ? "selected" : ""}`}
                      style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 4 }}
                      onClick={() => setVoiceId(v.voice_id)}
                    >
                      <strong>{v.name}</strong>
                      <span style={{ fontSize: 10, color: "var(--text-sub)", marginLeft: 8 }}>{v.voice_id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="charm-field">
              <label className="charm-label">语音输入 (STT)</label>
              <div className="charm-chips">
                <button
                  className={`charm-chip ${sttEnabled ? "selected" : ""}`}
                  onClick={() => setSttEnabled(!sttEnabled)}
                >
                  {sttEnabled ? "STT ✓" : "STT"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="charm-footer">
          <button className="charm-save" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
