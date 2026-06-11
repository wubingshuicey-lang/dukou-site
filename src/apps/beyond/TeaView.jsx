import { useState } from "react";
import { getModelSettings } from "../../store/settings.js";
import { callOpenAICompatible } from "../../api/providers/openaiCompatible.js";

// Custom SVG icons to replace emoji
function TeaIcon() { return (<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M7 20h10"/><path d="M8 8c0-2 1.5-4 4-4s4 2 4 4v9H8V8Z"/><path d="M16 12h2a3 3 0 0 1 0 6h-2"/></svg>); }
function TeapotIcon() { return (<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3"><ellipse cx="12" cy="14" rx="6" ry="5"/><path d="M6 10v4M18 10v4"/><path d="M9 6h6l1 3H8l1-3Z"/><path d="M17 7c1.5.5 3 2 3 3"/><path d="M5 14c-1 0-2-1-2-2s1-1.5 1.5-1.5"/></svg>); }
function FlowerIcon() { return (<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="6" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><circle cx="12" cy="18" r="3"/></svg>); }
function LeafIcon() { return (<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M12 2v18"/><path d="M12 4C8 4 4 8 4 12s4 8 8 8"/><path d="M12 20c4 0 8-4 8-8s-4-8-8-8"/><path d="M17 7c-1 0-2 1-2 2"/></svg>); }
function ChrysanthemumIcon() { return (<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="2"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1"/></svg>); }
function OolongIcon() { return (<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="12" cy="14" r="6"/><path d="M8 8c2-3 6-3 8 0"/><path d="M9 7c1-2 3-2 4-1"/></svg>); }

function CalmIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 9h12M3 13h10M3 5h8"/></svg>); }
function WarmIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9 3v10M5 7c0-3 4-4 4-4s4 1 4 4c0 4-4 7-4 7s-4-3-4-7Z"/></svg>); }
function RainIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 9c-1.5 0-3-1-3-2.5S2.5 4 4 4h8c1.5 0 3 1 3 2.5S13.5 9 12 9"/><path d="M6 9v5M9 11v4M12 9v3"/></svg>); }
function LonelyIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="9" cy="6" r="3"/><path d="M4 15c0-3 2-5 5-5s5 2 5 5"/></svg>); }
function StarIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M9 2l1.5 5.5h5.5l-4.5 3 1.5 5.5L9 13l-4.5 3 1.5-5.5-4.5-3h5.5L9 2Z"/></svg>); }
function MoonIcon() { return (<svg viewBox="0 0 18 18" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M13 10a6 6 0 0 1-7-7 8 8 0 1 0 7 7Z"/></svg>); }

const TEA_OPTIONS = [
  { id: "green", name: "龙井", icon: <TeaIcon />, desc: "清淡回甘，适合安静的午后" },
  { id: "black", name: "正山小种", icon: <TeapotIcon />, desc: "醇厚温暖，适合雨夜长谈" },
  { id: "jasmine", name: "茉莉花茶", icon: <FlowerIcon />, desc: "花香怡人，适合心事倾诉" },
  { id: "pu", name: "普洱", icon: <LeafIcon />, desc: "陈香厚重，适合回忆往事" },
  { id: "herbal", name: "菊花茶", icon: <ChrysanthemumIcon />, desc: "清心明目，适合独自静思" },
  { id: "oolong", name: "铁观音", icon: <OolongIcon />, desc: "韵味悠长，适合故人重逢" },
];

const MOOD_OPTIONS = [
  { id: "calm", label: "平静", icon: <CalmIcon /> },
  { id: "warm", label: "温暖", icon: <WarmIcon /> },
  { id: "sad", label: "感伤", icon: <RainIcon /> },
  { id: "lonely", label: "孤独", icon: <LonelyIcon /> },
  { id: "happy", label: "愉悦", icon: <StarIcon /> },
  { id: "nostalgic", label: "怀旧", icon: <MoonIcon /> },
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
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: "var(--accent-cold)", marginBottom: 8, display: "inline-block", opacity: 0.7 }}>
          <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 40h20"/>
            <path d="M16 16c0-4 3-8 8-8s8 4 8 8v18H16V16Z"/>
            <path d="M32 24h4a6 6 0 0 1 0 12h-4"/>
            <path d="M18 24c-1.5 1-4 1-4 0s2-2 4 0Z" strokeWidth="0.8"/>
            <path d="M30 24c1.5 1 4 1 4 0s-2-2-4 0Z" strokeWidth="0.8"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>茶会</h2>
        <p style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.7, margin: 0 }}>
          选一壶茶，配一种心情。在这里坐一会儿。
        </p>
      </div>

      {/* Tea selection */}
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
                padding: "12px",
                border: tea === t.id ? "2px solid var(--accent-cold)" : "1px solid var(--border-color)",
                borderRadius: 10,
                background: tea === t.id ? "var(--highlight-bg)" : "var(--panel-bg)",
                color: "var(--text-main)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <div style={{
                color: tea === t.id ? "var(--accent-cold)" : "var(--text-sub)",
                flexShrink: 0,
                marginTop: 2,
              }}>
                {t.icon}
              </div>
              <div>
                <strong style={{ fontWeight: 500 }}>{t.name}</strong>
                <div style={{ fontSize: 10, color: "var(--text-sub)", marginTop: 2 }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mood selection */}
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ color: mood === m.id ? "var(--accent-cold)" : "var(--text-sub)" }}>
                {m.icon}
              </span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
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
            width: "100%", resize: "vertical",
            border: "1px solid var(--border-color)", borderRadius: 8, outline: 0,
            background: "var(--panel-bg)", color: "var(--text-main)",
            fontSize: 14, lineHeight: 1.7, padding: "10px 12px",
            fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
      </div>

      <button
        onClick={handleBrew}
        disabled={loading || !tea || !mood}
        style={{
          width: "100%", padding: "12px 0", border: 0, borderRadius: 10,
          background: loading ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154,170,181,0.78))",
          color: "#fff", fontSize: 15, fontWeight: 500,
          cursor: loading || !tea || !mood ? "default" : "pointer",
          fontFamily: "inherit", opacity: loading || !tea || !mood ? 0.5 : 1,
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
          marginTop: 20, padding: "20px 18px",
          border: "1px solid var(--border-color)", borderRadius: 12,
          background: "var(--panel-bg)", fontSize: 14, lineHeight: 2,
          color: "var(--text-main)", whiteSpace: "pre-wrap", textAlign: "center",
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
