import { useState } from "react";
import { getModelSettings } from "../../store/settings.js";
import { callOpenAICompatible } from "../../api/providers/openaiCompatible.js";

const TEA_OPTIONS = [
  { id: "green", name: "龙井", emoji: "🍵", desc: "清淡回甘，适合安静的午后" },
  { id: "black", name: "正山小种", emoji: "🫖", desc: "醇厚温暖，适合雨夜长谈" },
  { id: "jasmine", name: "茉莉花茶", emoji: "🌸", desc: "花香怡人，适合心事倾诉" },
  { id: "pu", name: "普洱", emoji: "🍂", desc: "陈香厚重，适合回忆往事" },
  { id: "herbal", name: "菊花茶", emoji: "🌼", desc: "清心明目，适合独自静思" },
  { id: "oolong", name: "铁观音", emoji: "🧋", desc: "韵味悠长，适合故人重逢" },
];

const MOOD_OPTIONS = [
  { id: "calm", label: "平静", emoji: "😌" },
  { id: "warm", label: "温暖", emoji: "🕯" },
  { id: "sad", label: "感伤", emoji: "🥀" },
  { id: "lonely", label: "孤独", emoji: "🌧" },
  { id: "happy", label: "愉悦", emoji: "✨" },
  { id: "nostalgic", label: "怀旧", emoji: "📜" },
];

export default function TeaView() {
  const [tea, setTea] = useState("");
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const selectedTea = TEA_OPTIONS.find((t) => t.id === tea);
  const selectedMood = MOOD_OPTIONS.find((m) => m.id === mood);

  const handleBrew = async () => {
    if (!tea || !mood) return;
    setLoading(true);
    setError("");

    try {
      const settings = getModelSettings();
      if (!settings.apiKey) {
        setError("请先在设置里填写 API Key");
        setLoading(false);
        return;
      }

      const prompt = `你是一位温柔的茶会主人。用中文，150字以内，像在和一个深夜来访的朋友说话。

泡的茶：${selectedTea.name}（${selectedTea.desc}）
此刻心情：${selectedMood.label}
${note ? `来访者留言：${note.trim()}` : ""}

请以茶喻情，写一段温暖的话给来访者。不要用 emoji，语气自然亲切。`;

      const response = await callOpenAICompatible({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "你是茶会主人，温和亲切，用诗意但不做作的语气说话。保持简洁。",
        settings: { ...settings, temperature: 0.9, maxTokens: 300 },
      });

      setResult(response?.text || "");
    } catch (err) {
      setError(err.message || "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 4 }}>
          {selectedTea ? selectedTea.emoji : "🍵"}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>茶会</h2>
        <p style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.7, margin: 0 }}>
          选一壶茶，配一种心情。在这里坐一会儿。
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-sub)", marginBottom: 8 }}>
          选一种茶
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {TEA_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTea(t.id); setResult(""); }}
              style={{
                padding: "10px 12px",
                border: tea === t.id ? "2px solid var(--accent-cold)" : "1px solid var(--border-color)",
                borderRadius: 10,
                background: tea === t.id ? "var(--highlight-bg)" : "var(--panel-bg)",
                color: "var(--text-main)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ marginRight: 6 }}>{t.emoji}</span>
              <strong style={{ fontWeight: 500 }}>{t.name}</strong>
              <div style={{ fontSize: 10, color: "var(--text-sub)", marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-sub)", marginBottom: 8 }}>
          此刻心情
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMood(m.id); setResult(""); }}
              style={{
                padding: "6px 14px",
                border: mood === m.id ? "2px solid var(--accent-cold)" : "1px solid var(--border-color)",
                borderRadius: 20,
                background: mood === m.id ? "var(--highlight-bg)" : "var(--panel-bg)",
                color: "var(--text-main)",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-sub)", marginBottom: 8 }}>
          想说点什么（可选）
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今天……"
          rows={2}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            outline: 0,
            background: "var(--panel-bg)",
            color: "var(--text-main)",
            fontSize: 14,
            lineHeight: 1.7,
            padding: "10px 12px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleBrew}
        disabled={loading || !tea || !mood}
        style={{
          width: "100%",
          padding: "12px 0",
          border: 0,
          borderRadius: 10,
          background: loading ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154, 170, 181, 0.78))",
          color: "#fff",
          fontSize: 15,
          fontWeight: 500,
          cursor: loading || !tea || !mood ? "default" : "pointer",
          fontFamily: "inherit",
          opacity: loading || !tea || !mood ? 0.5 : 1,
        }}
      >
        {loading ? "沏茶中……" : "沏一壶茶"}
      </button>

      {error && (
        <div style={{ marginTop: 14, fontSize: 12, color: "var(--danger)", textAlign: "center" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: 20,
          padding: "20px 18px",
          border: "1px solid var(--border-color)",
          borderRadius: 12,
          background: "var(--panel-bg)",
          fontSize: 14,
          lineHeight: 2,
          color: "var(--text-main)",
          whiteSpace: "pre-wrap",
          textAlign: "center",
          fontFamily: "DukouHuiwenMincho, Kaiti SC, STKaiti, cursive, serif",
        }}>
          {result}
          <div style={{ marginTop: 14, fontSize: 10, color: "var(--text-sub)" }}>
            —— {selectedTea?.name} · {selectedMood?.label}
          </div>
        </div>
      )}
    </div>
  );
}
