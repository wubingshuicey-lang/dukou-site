import { useState } from "react";
import {
  ORIENTATION_OPTIONS,
  RELATIONSHIP_MODE_OPTIONS,
  KINK_CATEGORIES,
  MODEL_PROVIDER_OPTIONS,
  createCustomCharacter,
  getAcceptedCharacters,
  updateCharacter,
} from "../store/characters.js";
import { callModel } from "../api/modelClient.js";
import { getModelSettings } from "../store/settings.js";

export default function CharacterCreatePage({ onBack }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [orientation, setOrientation] = useState("");
  const [customOrientation, setCustomOrientation] = useState("");
  const [relationshipModes, setRelationshipModes] = useState([]);
  const [customRelationship, setCustomRelationship] = useState("");
  const [involvedChars, setInvolvedChars] = useState([]);
  const [kinks, setKinks] = useState([]);
  const [pureLoveMode, setPureLoveMode] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Model config
  const [modelProvider, setModelProvider] = useState("");
  const [modelApiKey, setModelApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelBaseUrl, setModelBaseUrl] = useState("");
  // Voice config
  const [voiceId, setVoiceId] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sttEnabled, setSttEnabled] = useState(false);

  const selectedProvider = MODEL_PROVIDER_OPTIONS.find((p) => p.id === modelProvider);
  const needsApiKey = modelProvider && modelProvider !== "";
  const needsBaseUrl = modelProvider === "custom";
  const needsModelName = modelProvider === "openrouter" || modelProvider === "custom";

  const existingChars = getAcceptedCharacters();

  function toggleRelationshipMode(modeId) {
    setRelationshipModes((prev) =>
      prev.includes(modeId) ? prev.filter((m) => m !== modeId) : [...prev, modeId]
    );
  }

  function toggleKink(kinkId) {
    setKinks((prev) =>
      prev.includes(kinkId) ? prev.filter((k) => k !== kinkId) : [...prev, kinkId]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    const character = createCustomCharacter({
      name: name.trim(),
      avatarInitial: name.trim()[0],
      description: description.trim(),
      personality: personality.trim(),
      orientation,
      customOrientation,
      relationshipModes,
      customRelationship,
      involvedCharacters: involvedChars,
      kinks,
      pureLoveMode,
      modelProvider,
      modelApiKey,
      modelName,
      modelBaseUrl,
      voiceId,
      ttsEnabled,
      sttEnabled,
    });

    setGenerating(true);
    try {
      const settings = getModelSettings();
      if (settings.apiKey) {
        const descParts = [];
        if (description) descParts.push(`角色简介：${description}`);
        if (personality) descParts.push(`性格设定：${personality}`);
        if (orientation) {
          const label = ORIENTATION_OPTIONS.find(o => o.id === orientation)?.label || orientation;
          descParts.push(`性向：${label}`);
        }
        const result = await callModel({
          messages: [{
            role: "user",
            content: `为角色"${name}"生成一段150字以内的背景故事。\n${descParts.join("\n")}`,
          }],
          systemPrompt: "你是角色背景故事生成器。只输出背景故事本身，不要加前缀、说明或评价。故事要自然、有人情味，像真实人物简介。",
          settings,
        });
        if (result.ok && result.text) {
          updateCharacter(character.id, { backstory: result.text.trim() });
        }
      }
    } catch {
      // backstory generation is optional
    }
    setGenerating(false);
    onBack();
  }

  return (
    <div className="create-char-root">
      <div className="create-char-header">
        <button className="create-char-back" onClick={onBack}>←</button>
        <span className="create-char-header-title">创建角色</span>
      </div>

      <div className="create-char-body">
        {/* Basic info */}
        <div className="create-char-section">
          <div className="create-char-section-title">基本信息</div>
          <div className="create-char-field">
            <label className="create-char-label">角色名称 *</label>
            <input
              className="create-char-input"
              placeholder="给角色起个名字"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="create-char-field">
            <label className="create-char-label">角色简介</label>
            <input
              className="create-char-input"
              placeholder="一句话描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="create-char-field">
            <label className="create-char-label">性格设定</label>
            <textarea
              className="create-char-textarea"
              placeholder="描述角色的性格、说话方式、背景..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
            />
          </div>
        </div>

        {/* Orientation */}
        <div className="create-char-section">
          <div className="create-char-section-title">性向</div>
          <div className="create-char-chips">
            {ORIENTATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`create-char-chip ${orientation === opt.id ? "selected" : ""}`}
                onClick={() => setOrientation(opt.id)}
              >
                {opt.label}
                {opt.note && <span className="create-char-chip-note">{opt.note}</span>}
              </button>
            ))}
          </div>
          {orientation === "custom" && (
            <div className="create-char-field" style={{ marginTop: 10 }}>
              <input
                className="create-char-input"
                placeholder="自定义性向..."
                value={customOrientation}
                onChange={(e) => setCustomOrientation(e.target.value)}
              />
            </div>
          )}
          {orientation === "lesbian" && (
            <p className="create-char-section-desc" style={{ marginTop: 8 }}>
              注意：选择女同后，所有描述将使用女性化身体、声音、动作描写，避免"喉结""高大身躯"等男性化词汇。
            </p>
          )}
        </div>

        {/* Relationship modes */}
        <div className="create-char-section">
          <div className="create-char-section-title">恋爱方式 / 关系模式（可多选）</div>
          <p className="create-char-section-desc">
            所有恋爱方式需指定参与角色，未指定时 AI 随机分配
          </p>
          <div className="create-char-chips">
            {RELATIONSHIP_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`create-char-chip ${relationshipModes.includes(opt.id) ? "selected" : ""}`}
                onClick={() => toggleRelationshipMode(opt.id)}
              >
                {opt.label}
                {opt.note && <span className="create-char-chip-note">{opt.note}</span>}
              </button>
            ))}
          </div>
          {relationshipModes.includes("custom_relationship") && (
            <div className="create-char-field" style={{ marginTop: 10 }}>
              <input
                className="create-char-input"
                placeholder="自定义关系模式..."
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
              />
            </div>
          )}

          {relationshipModes.length > 0 && (
            <div className="create-char-field" style={{ marginTop: 12 }}>
              <label className="create-char-label">参与角色（可多选）</label>
              <div className="create-char-chips">
                <button
                  className={`create-char-chip ${involvedChars.includes("player") ? "selected" : ""}`}
                  onClick={() =>
                    setInvolvedChars((prev) =>
                      prev.includes("player") ? prev.filter((c) => c !== "player") : [...prev, "player"]
                    )
                  }
                >
                  我（玩家）
                </button>
                {existingChars.map((c) => (
                  <button
                    key={c.id}
                    className={`create-char-chip ${involvedChars.includes(c.id) ? "selected" : ""}`}
                    onClick={() =>
                      setInvolvedChars((prev) =>
                        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                      )
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kinks */}
        <div className="create-char-section">
          <div className="create-char-section-title">性癖向（可多选）</div>
          <p className="create-char-section-desc">
            可在游戏开始或性行为出现前选择。重度性癖需高好感+高信任自动触发。
          </p>
          {Object.entries(KINK_CATEGORIES).map(([catKey, cat]) => (
            <div key={catKey} className="create-char-kink-cat">
              <span className="create-char-kink-label">{cat.label}</span>
              <div className="create-char-chips">
                {cat.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={`create-char-chip ${kinks.includes(opt.id) ? "selected" : ""}`}
                    onClick={() => toggleKink(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pure love mode toggle */}
        <div className="create-char-section">
          <div className="create-char-section-title">模式开关</div>
          <div className="create-char-chips">
            <button
              className={`create-char-chip ${pureLoveMode ? "selected" : ""}`}
              onClick={() => setPureLoveMode(!pureLoveMode)}
            >
              {pureLoveMode ? "纯爱模式 ✓" : "纯爱模式"}
            </button>
          </div>
          <p className="create-char-section-desc" style={{ marginTop: 8 }}>
            开启纯爱模式后，所有色情内容将被过滤，只保留情感互动。
          </p>
        </div>

        {/* Model Configuration */}
        <div className="create-char-section">
          <div className="create-char-section-title">AI 模型配置</div>
          <p className="create-char-section-desc">
            为此角色单独配置 AI 模型。留空则使用全局设置。
          </p>
          <div className="create-char-chips">
            {MODEL_PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`create-char-chip ${modelProvider === opt.id ? "selected" : ""}`}
                onClick={() => {
                  setModelProvider(opt.id);
                  setModelName(opt.defaultModel || "");
                  setModelBaseUrl(opt.baseUrl || "");
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {needsApiKey && (
            <div className="create-char-field" style={{ marginTop: 12 }}>
              <label className="create-char-label">API Key</label>
              <input
                className="create-char-input"
                type="password"
                placeholder={`输入 ${selectedProvider?.label || ""} 的 API Key`}
                value={modelApiKey}
                onChange={(e) => setModelApiKey(e.target.value)}
              />
            </div>
          )}

          {needsBaseUrl && (
            <div className="create-char-field" style={{ marginTop: 12 }}>
              <label className="create-char-label">接口地址 (Base URL)</label>
              <input
                className="create-char-input"
                placeholder="https://your-api.example.com/v1"
                value={modelBaseUrl}
                onChange={(e) => setModelBaseUrl(e.target.value)}
              />
            </div>
          )}

          {needsModelName && (
            <div className="create-char-field" style={{ marginTop: 12 }}>
              <label className="create-char-label">模型名称</label>
              <input
                className="create-char-input"
                placeholder="输入模型 ID，如 deepseek-chat"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Voice Configuration */}
        <div className="create-char-section">
          <div className="create-char-section-title">语音配置</div>
          <p className="create-char-section-desc">
            使用 ElevenLabs 为角色合成语音，并控制语音输入/输出开关。
          </p>

          <div className="create-char-field">
            <label className="create-char-label">ElevenLabs Voice ID</label>
            <input
              className="create-char-input"
              placeholder="输入 ElevenLabs 的 Voice ID"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
            />
          </div>

          <div className="create-char-field" style={{ marginTop: 12 }}>
            <label className="create-char-label">功能开关</label>
            <div className="create-char-chips">
              <button
                className={`create-char-chip ${ttsEnabled ? "selected" : ""}`}
                onClick={() => setTtsEnabled(!ttsEnabled)}
              >
                {ttsEnabled ? "TTS 语音播报 ✓" : "TTS 语音播报"}
              </button>
              <button
                className={`create-char-chip ${sttEnabled ? "selected" : ""}`}
                onClick={() => setSttEnabled(!sttEnabled)}
              >
                {sttEnabled ? "STT 语音输入 ✓" : "STT 语音输入"}
              </button>
            </div>
          </div>
        </div>

        <button className="create-char-submit" onClick={handleSubmit} disabled={generating}>
          {generating ? "正在生成角色背景故事..." : "创建角色并发起好友申请"}
        </button>
      </div>
    </div>
  );
}
