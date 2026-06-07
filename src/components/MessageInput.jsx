import { useState } from "react";

function truncateText(text, limit = 30) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit)}...` : clean;
}

function getQuoteAuthorLabel(quote, displayNames) {
  if (quote?.role === "assistant") return displayNames.assistant;
  if (quote?.role === "user") return displayNames.user;
  if (quote?.authorName === "机") return displayNames.assistant;
  if (quote?.authorName === "我") return displayNames.user;
  return quote?.authorName || displayNames.user;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 3.5v11M3.5 9h11" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2.5" y="3.5" width="13" height="11" rx="2" />
      <circle cx="6.2" cy="7" r="1.2" />
      <path d="M4.5 13l3.5-3.5 2.4 2.3 1.4-1.4 2 2.6" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect x="6.3" y="2.6" width="5.4" height="8.8" rx="2.7" />
      <path d="M3.8 8.6a5.2 5.2 0 0 0 10.4 0M9 13.8v2" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox='0 0 18 18' aria-hidden='true'>
      <path d='M5 2.8h5.1l3 3v9.4H5z' />
      <path d='M10 2.8V6h3.1M6.8 9h4.4M6.8 11.4h4.4' />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox='0 0 16 16' aria-hidden='true'>
      <path d='M1.5 8.5L14.5 2L8.5 14.5L6.8 9.2L1.5 8.5Z' fill='currentColor' />
    </svg>
  );
}

function CallIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M5.4 3.2 7 6.6 5.7 8c.8 1.7 2.2 3.1 4 4l1.4-1.3 3.4 1.6-.7 2.4c-.2.6-.8 1-1.4.9C7 15.1 2.9 11 2.4 5.6c-.1-.6.3-1.2.9-1.4l2.1-1Z" />
    </svg>
  );
}

export default function MessageInput({
  value,
  quote,
  onChange,
  onClearQuote,
  onSend,
  onToolAction,
  disabled,
  disabledLabel = "机暂时离开了",
  placeholder = "说点什么...",
  displayNames = { assistant: "机", user: "我" },
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const hasTextContent = Boolean(value.trim());
  const toolItems = [
    { id: 'image', label: '图片', icon: <ImageIcon /> },
    { id: 'file', label: '上传文件', icon: <FileIcon /> },
    { id: 'call', label: '电话', icon: <CallIcon /> },
  ];

  const selectTool = (id) => {
    onToolAction?.(id);
    setToolsOpen(false);
  };

  const submitInput = () => {
    if (hasTextContent) {
      onSend();
      return;
    }

    selectTool('voice');
  };

  return (
    <div className="message-input-area">
      <form
        className="message-input-bar"
        onSubmit={(event) => {
          event.preventDefault();
          submitInput();
        }}
      >
        <button
          className={`message-plus-button${toolsOpen ? " is-open" : ""}`}
          type="button"
          onClick={() => setToolsOpen((open) => !open)}
          aria-label={toolsOpen ? "收起聊天工具" : "展开聊天工具"}
          aria-expanded={toolsOpen}
        >
          <PlusIcon />
        </button>
        <div className="message-input-shell">
          {quote && (
            <div className="message-input-quote">
              <div>
                <span>引用 {getQuoteAuthorLabel(quote, displayNames)}</span>
                <strong>{truncateText(quote.content || quote.title || quote.body)}</strong>
              </div>
              <button type="button" onClick={onClearQuote} aria-label="取消引用">
                ×
              </button>
            </div>
          )}
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitInput();
              }
            }}
            placeholder={disabled ? disabledLabel : placeholder}
            disabled={disabled}
            rows={1}
          />
        </div>
        <button
          className={'send-button' + (hasTextContent ? '' : ' is-voice')}
          type='submit'
          disabled={disabled}
          aria-label={hasTextContent ? '发送' : '发送语音'}
        >
          {hasTextContent ? <SendIcon /> : <VoiceIcon />}
        </button>
      </form>
      {toolsOpen && (
        <div className="message-tool-panel" aria-label="聊天工具选项">
          {toolItems.map((item) => (
            <button key={item.id} type="button" onClick={() => selectTool(item.id)} aria-label={item.label}>
              <span>{item.icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
