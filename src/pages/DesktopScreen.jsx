import { useState, useEffect } from "react";
import { getTimeSlot } from "../systems/time.js";
import { getBlockedCharIds } from "../store/characters.js";

const APPS = [
  { id: "wechat", label: "微聊", char: "微", style: "wechat" },
  { id: "function", label: "功能", char: "功", style: "dukou" },
  { id: "settings", label: "设置", char: "设", style: "settings" },
  { id: "notes", label: "笔记", char: "笔", style: "disabled", disabled: true },
  { id: "gallery", label: "相册", char: "相", style: "dukou" },
  { id: "mail", label: "信箱", char: "信", style: "mail" },
  { id: "weather", label: "天气", char: "天", style: "disabled", disabled: true },
  { id: "beyond", label: "彼岸", char: "彼", style: "dukou" },
];

function getNoteCount() {
  try {
    const blocked = getBlockedCharIds();
    let count = 0;
    for (const id of blocked) {
      const msgs = JSON.parse(localStorage.getItem(`dukou:blockedMsgs:${id}`) || "[]");
      count += msgs.length;
    }
    return count;
  } catch { return 0; }
}

export default function DesktopScreen({ onOpenApp }) {
  const slot = getTimeSlot();
  const [noteCount, setNoteCount] = useState(getNoteCount);

  useEffect(() => {
    const timer = setInterval(() => setNoteCount(getNoteCount()), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="desktop-root">
      <div className="desktop-statusbar">
        <span className="desktop-time">
          {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="desktop-greeting">{slot.greeting}</span>
      </div>

      <div className="desktop-grid">
        {APPS.map((app) => (
          <button
            key={app.id}
            className={`desktop-app-icon ${app.disabled ? "desktop-app-disabled" : ""}`}
            onClick={() => !app.disabled && onOpenApp(app.id)}
            disabled={app.disabled}
            style={{ position: "relative" }}
          >
            {app.id === "mail" && noteCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "var(--danger)", color: "#fff",
                borderRadius: "50%", width: 20, height: 20,
                fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1,
              }}>{noteCount}</span>
            )}
            <span className={`desktop-icon-badge ${app.style}`}>
              {app.char}
            </span>
            <span className="desktop-icon-label">{app.label}</span>
            {app.disabled && <span className="desktop-icon-soon">即将开放</span>}
          </button>
        ))}
      </div>

      <div className="desktop-dock">
        <button className="desktop-dock-icon" onClick={() => onOpenApp("wechat")}>
          <span className="desktop-icon-badge wechat" style={{ width: 44, height: 44, fontSize: 20 }}>微</span>
        </button>
        <button className="desktop-dock-icon" onClick={() => onOpenApp("settings")}>
          <span className="desktop-icon-badge settings" style={{ width: 44, height: 44, fontSize: 20 }}>设</span>
        </button>
      </div>
    </div>
  );
}
