import { useRef, useState } from "react";

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

function compressImage(file, maxSize) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.85);
    };
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    // 释放 blob URL（M1）
    const revoke = () => { URL.revokeObjectURL(objectUrl); img.removeEventListener('load', revoke); img.removeEventListener('error', revoke); };
    img.addEventListener('load', revoke);
    img.addEventListener('error', revoke);
  });
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

function CameraIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M6 4.5L7.5 3h3l1.5 1.5H15v10H3v-10h3z" />
      <circle cx="9" cy="9.5" r="2.5" />
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
  onVoiceStart,
  onVoiceStop,
  voiceEnabled = false,
  voiceActive = false,
  onImageSelect,
  pendingImage,
  onClearImage,
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const hasTextContent = Boolean(value.trim());
  const hasPendingContent = hasTextContent || Boolean(pendingImage);
  const toolItems = [
    { id: 'image', label: '图片', icon: <ImageIcon /> },
    { id: 'camera', label: '拍照', icon: <CameraIcon /> },
    { id: 'file', label: '上传文件', icon: <FileIcon /> },
    { id: 'call', label: '电话', icon: <CallIcon /> },
  ];

  const selectTool = (id) => {
    if (id === "image") {
      fileInputRef.current?.click();
    } else if (id === "camera") {
      cameraInputRef.current?.click();
    } else {
      onToolAction?.(id);
    }
    setToolsOpen(false);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 1024);
    onImageSelect?.(compressed);
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const submitInput = () => {
    if (hasPendingContent) {
      onSend();
      return;
    }
    // Voice is now hold-to-talk via pointer events, not click-to-toggle
    selectTool('voice');
  };

  return (
    <div className="message-input-area">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {/* Camera input — mobile direct capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {pendingImage && (
        <div className="message-image-preview">
          <img src={pendingImage} alt="待发送图片" />
          <button type="button" onClick={onClearImage} aria-label="移除图片">×</button>
        </div>
      )}
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
          className={'send-button' + (hasPendingContent ? '' : ' is-voice') + (voiceActive ? ' is-recording' : '')}
          type={hasPendingContent ? 'submit' : 'button'}
          disabled={disabled}
          aria-label={hasPendingContent ? '发送' : '按住说话'}
          style={voiceActive ? { background: 'var(--danger)', animation: 'du-pulse 1s infinite' } : undefined}
          onPointerDown={(e) => {
            if (hasPendingContent || disabled) return;
            e.preventDefault();
            onVoiceStart?.();
          }}
          onPointerUp={(e) => {
            if (hasPendingContent || disabled) return;
            e.preventDefault();
            onVoiceStop?.();
          }}
          onPointerLeave={(e) => {
            if (hasPendingContent || disabled || !voiceActive) return;
            e.preventDefault();
            onVoiceStop?.();
          }}
        >
          {hasPendingContent ? <SendIcon /> : voiceActive ? <span style={{fontSize:10,pointerEvents:'none'}}>■</span> : <VoiceIcon />}
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
