import { useState } from "react";
import TarotView from "./beyond/TarotView.jsx";
import StoryView from "./beyond/StoryView.jsx";
import TeaView from "./beyond/TeaView.jsx";

const TABS = [
  { id: "tarot", label: "塔罗" },
  { id: "story", label: "故事" },
  { id: "tea", label: "茶会" },
];

export default function BeyondApp({ onBack }) {
  const [tab, setTab] = useState("tarot");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--shell-bg)",
      }}>
        <button
          onClick={onBack}
          style={{
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            background: "var(--panel-bg)",
            backdropFilter: "blur(8px)",
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--text-sub)",
            fontFamily: "inherit",
          }}
        >
          ← 桌面
        </button>
        <strong style={{ fontSize: 15, fontWeight: 500 }}>彼岸</strong>
      </div>

      <div style={{
        flexShrink: 0,
        display: "flex",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--shell-bg)",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              border: 0,
              borderBottom: tab === t.id ? "2px solid var(--accent-cold)" : "2px solid transparent",
              background: "transparent",
              color: tab === t.id ? "var(--accent-cold)" : "var(--text-sub)",
              fontSize: 13,
              fontWeight: tab === t.id ? 500 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {tab === "tarot" && <TarotView />}
        {tab === "story" && <StoryView />}
        {tab === "tea" && <TeaView />}
      </div>
    </div>
  );
}
