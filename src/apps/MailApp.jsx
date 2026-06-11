import { useState, useEffect } from "react";
import { getBlockedCharIds, getAllCharacters } from "../store/characters.js";
import { formatTime } from "../systems/time.js";

export default function MailApp({ onBack }) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const blocked = getBlockedCharIds();
    const chars = getAllCharacters();
    const all = [];
    for (const id of blocked) {
      const char = chars.find((c) => c.id === id);
      try {
        const msgs = JSON.parse(localStorage.getItem(`dukou:blockedMsgs:${id}`) || "[]");
        for (const m of msgs) {
          all.push({
            ...m,
            charName: char?.name || "未知",
            charId: id,
          });
        }
      } catch {}
    }
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setNotes(all);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderBottom: "1px solid var(--border-color)",
        background: "var(--shell-bg)",
      }}>
        <button onClick={onBack} style={{
          border: "1px solid var(--border-color)", borderRadius: 8,
          background: "var(--panel-bg)", padding: "4px 10px",
          fontSize: 12, cursor: "pointer", color: "var(--text-sub)", fontFamily: "inherit",
        }}>← 桌面</button>
        <strong style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>信箱</strong>
        <span style={{ fontSize: 11, color: "var(--text-sub)" }}>
          {notes.length} 封小纸条
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px" }}>
        {notes.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-sub)" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>📨</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>信箱空着</div>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              拉黑的角色会在无法联系时把想说的话放进信箱
            </div>
          </div>
        )}

        {notes.map((n, i) => (
          <div key={i} style={{
            padding: "12px 14px", marginBottom: 8,
            border: "1px solid var(--border-color)", borderRadius: 10,
            background: "var(--panel-bg)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 6,
            }}>
              <strong style={{ fontSize: 13, color: "var(--text-main)" }}>
                {n.charName}
              </strong>
              <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>
                ❗ 被拉黑期间发送
              </span>
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.7, color: "var(--text-main)",
              marginBottom: 4, whiteSpace: "pre-wrap",
            }}>
              {n.content}
            </div>
            <div style={{
              fontSize: 10, color: "var(--text-sub)",
            }}>
              {n.created_at ? formatTime(n.created_at) : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
