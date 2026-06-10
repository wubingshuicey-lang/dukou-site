import { getTimeSlot } from "../systems/time.js";

const APPS = [
  { id: "wechat", label: "微聊", char: "微", style: "wechat" },
  { id: "function", label: "功能", char: "功", style: "dukou" },
  { id: "settings", label: "设置", char: "设", style: "settings" },
  { id: "notes", label: "笔记", char: "笔", style: "disabled", disabled: true },
  { id: "gallery", label: "相册", char: "相", style: "dukou" },
  { id: "mail", label: "信箱", char: "信", style: "disabled", disabled: true },
  { id: "weather", label: "天气", char: "天", style: "disabled", disabled: true },
  { id: "beyond", label: "彼岸", char: "彼", style: "dukou" },
];

export default function DesktopScreen({ onOpenApp }) {
  const slot = getTimeSlot();

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
          >
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
