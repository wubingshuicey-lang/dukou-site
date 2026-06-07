export default function TypingDots() {
  return (
    <div className="bubble-row">
      <div className="du-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
        机
      </div>
      <div className="typing-dots" aria-label="正在输入">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
