export default function WeChatTopBar({ title, onBack, rightAction }) {
  return (
    <div className="wechat-topbar">
      {onBack ? (
        <button className="wechat-topbar-back" onClick={onBack}>←</button>
      ) : (
        <span className="wechat-topbar-back" />
      )}
      <span className="wechat-topbar-title">{title || "微信"}</span>
      {rightAction ? (
        <button className="wechat-topbar-action" onClick={rightAction}>+</button>
      ) : (
        <span className="wechat-topbar-action" />
      )}
    </div>
  );
}
