import { useEffect, useRef, useState } from "react";
import Bubble from "./Bubble.jsx";
import {
  exportMessagesJson,
  getMessageContext,
  getMessagesAfter,
  getMessagesBefore,
  searchMessages,
} from "../api/messageArchive.js";

const SEARCH_LIMIT = 30;
const CONTEXT_LIMIT = 30;
const DEFAULT_DISPLAY_NAMES = { assistant: "机", user: "我" };
const DEFAULT_AVATAR_IMAGES = { assistant: "", user: "" };
const DEFAULT_AVATAR_OPACITIES = { assistant: 1, user: 1 };

function SearchIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="8" cy="8" r="5" />
      <path d="m12 12 3 3" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 2.5v8" />
      <path d="m5.5 7.2 3.5 3.5 3.5-3.5" />
      <path d="M3.5 13.5h11" />
    </svg>
  );
}

function roleLabel(role, displayNames = DEFAULT_DISPLAY_NAMES) {
  if (role === "assistant") return displayNames.assistant || DEFAULT_DISPLAY_NAMES.assistant;
  if (role === "user") return displayNames.user || DEFAULT_DISPLAY_NAMES.user;
  return "系统";
}

function avatarInitial(role, displayNames = DEFAULT_DISPLAY_NAMES) {
  return roleLabel(role, displayNames).slice(0, 1) || "机";
}

function HistoryAvatar({ role, displayNames, avatarImages, avatarOpacities }) {
  const image = role === "user" ? avatarImages.user : avatarImages.assistant;
  const opacity = role === "user" ? avatarOpacities.user : avatarOpacities.assistant;
  return (
    <span className="history-result-avatar">
      {image ? <img src={image} alt="" style={{ opacity }} /> : avatarInitial(role, displayNames)}
    </span>
  );
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDateLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTimeOnly(value) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getSnippet(message, keyword) {
  const clean = String(message.content || "").replace(/\s+/g, " ").trim();
  if (!keyword.trim()) return clean.length > 54 ? `${clean.slice(0, 54)}...` : clean;

  const lower = clean.toLowerCase();
  const index = lower.indexOf(keyword.trim().toLowerCase());
  if (index < 0) return clean.length > 54 ? `${clean.slice(0, 54)}...` : clean;

  const start = Math.max(0, index - 18);
  const end = Math.min(clean.length, index + keyword.length + 36);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < clean.length ? "..." : "";
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

function groupResultsByDate(messages) {
  return messages.reduce((groups, message) => {
    const key = new Date(message.createdAt).toLocaleDateString("en-CA");
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(message);
      return groups;
    }
    return [...groups, { key, label: formatDateLabel(message.createdAt), items: [message] }];
  }, []);
}

function mergeMessages(...groups) {
  const map = new Map();
  groups.flat().forEach((message) => {
    map.set(message.id, message);
  });
  return [...map.values()].sort((a, b) => new Date(a.createdAt || a.created_at) - new Date(b.createdAt || b.created_at));
}

function downloadJson(text, fileName) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function HistoryContextViewer({ messageId, onBack, onClose, showToast, displayNames, avatarImages, avatarOpacities }) {
  const [messages, setMessages] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingBefore, setLoadingBefore] = useState(false);
  const [loadingAfter, setLoadingAfter] = useState(false);
  const [hasBefore, setHasBefore] = useState(true);
  const [hasAfter, setHasAfter] = useState(true);
  const [highlightedId, setHighlightedId] = useState("");
  const listRef = useRef(null);
  const messageRefs = useRef({});
  const didScrollTargetRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    didScrollTargetRef.current = false;

    getMessageContext({ messageId, before: CONTEXT_LIMIT, after: CONTEXT_LIMIT })
      .then((context) => {
        if (cancelled) return;
        setTarget(context.target);
        setMessages(context.messages);
        setHasBefore(context.messages.length > 0);
        setHasAfter(context.messages.length > 0);
      })
      .catch(() => {
        if (!cancelled) showToast("读取失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [messageId]);

  useEffect(() => {
    if (!target || didScrollTargetRef.current) return;
    const node = messageRefs.current[target.id];
    if (!node) return;

    didScrollTargetRef.current = true;
    node.scrollIntoView({ block: "center" });
    setHighlightedId(target.id);
    window.setTimeout(() => {
      setHighlightedId((current) => (current === target.id ? "" : current));
    }, 1400);
  }, [messages, target]);

  const loadBefore = async () => {
    if (loadingBefore || !hasBefore || !messages.length) return;
    const list = listRef.current;
    const previousHeight = list?.scrollHeight || 0;
    setLoadingBefore(true);
    try {
      const older = await getMessagesBefore({ beforeCreatedAt: messages[0].createdAt, limit: CONTEXT_LIMIT });
      setHasBefore(older.length >= CONTEXT_LIMIT);
      setMessages((current) => mergeMessages(older, current));
      window.requestAnimationFrame(() => {
        if (list) list.scrollTop += list.scrollHeight - previousHeight;
      });
    } catch {
      showToast("读取失败");
    } finally {
      setLoadingBefore(false);
    }
  };

  const loadAfter = async () => {
    if (loadingAfter || !hasAfter || !messages.length) return;
    setLoadingAfter(true);
    try {
      const newer = await getMessagesAfter({ afterCreatedAt: messages[messages.length - 1].createdAt, limit: CONTEXT_LIMIT });
      setHasAfter(newer.length >= CONTEXT_LIMIT);
      setMessages((current) => mergeMessages(current, newer));
    } catch {
      showToast("读取失败");
    } finally {
      setLoadingAfter(false);
    }
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;
    if (list.scrollTop < 24) loadBefore();
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 24) loadAfter();
  };

  return (
    <section className="history-context-viewer">
      <header className="history-overlay-header">
        <button type="button" onClick={onBack} aria-label="返回搜索结果">
          ‹
        </button>
        <div>
          <strong>{target ? formatDateTime(target.createdAt) : "聊天上下文"}</strong>
          <span>{target ? roleLabel(target.role, displayNames) : ""}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭聊天记录">
          ×
        </button>
      </header>

      <div className="history-context-list" ref={listRef} onScroll={handleScroll}>
        {loading && <p className="history-empty">读取中...</p>}
        {!loading && !messages.length && <p className="history-empty">没有找到这条消息。</p>}
        {!loading && messages.length > 0 && (
          <>
            {hasBefore && (
              <button className="history-load-button" type="button" onClick={loadBefore} disabled={loadingBefore}>
                {loadingBefore ? "读取中" : "更早"}
              </button>
            )}
            {messages.map((message) => (
              <Bubble
                key={message.id}
                message={message}
                showAvatar
                highlighted={highlightedId === message.id}
                readOnly
                displayNames={displayNames}
                avatarImages={avatarImages}
                avatarOpacities={avatarOpacities}
                messageRef={(node) => {
                  if (node) {
                    messageRefs.current[message.id] = node;
                  } else {
                    delete messageRefs.current[message.id];
                  }
                }}
              />
            ))}
            {hasAfter && (
              <button className="history-load-button" type="button" onClick={loadAfter} disabled={loadingAfter}>
                {loadingAfter ? "读取中" : "更晚"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function ChatHistoryOverlay({ onClose, displayNames = DEFAULT_DISPLAY_NAMES, avatarImages = DEFAULT_AVATAR_IMAGES, avatarOpacities = DEFAULT_AVATAR_OPACITIES }) {
  const [keyword, setKeyword] = useState("");
  const [date, setDate] = useState("");
  const [role, setRole] = useState("all");
  const [results, setResults] = useState([]);
  const [cursor, setCursor] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [toast, setToast] = useState("");
  const resultListRef = useRef(null);
  const resultGroups = groupResultsByDate(results);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? "" : current));
    }, 1800);
  };

  const runSearch = async ({ append = false } = {}) => {
    if (loading) return;
    const list = resultListRef.current;
    const previousHeight = list?.scrollHeight || 0;
    setLoading(true);
    try {
      const result = await searchMessages({
        keyword,
        dateFrom: date,
        dateTo: date,
        role,
        limit: SEARCH_LIMIT,
        cursor: append ? cursor : "",
      });
      setResults((current) => (append ? mergeMessages(result.items, current) : mergeMessages(result.items)));
      setCursor(result.nextCursor);
      window.requestAnimationFrame(() => {
        if (!list) return;
        if (append) {
          list.scrollTop += list.scrollHeight - previousHeight;
          return;
        }
        list.scrollTop = list.scrollHeight;
      });
    } catch {
      showToast("搜索失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
  }, []);

  const exportJson = async () => {
    try {
      const text = await exportMessagesJson();
      downloadJson(text, `dukou-chat-history-${new Date().toISOString().slice(0, 10)}.json`);
      showToast("已导出");
    } catch {
      showToast("导出失败");
    }
  };

  if (selectedMessageId) {
    return (
      <section className="chat-history-overlay" aria-label="聊天记录">
        <HistoryContextViewer
          messageId={selectedMessageId}
          onBack={() => setSelectedMessageId("")}
          onClose={onClose}
          showToast={showToast}
          displayNames={displayNames}
          avatarImages={avatarImages}
          avatarOpacities={avatarOpacities}
        />
        {toast && <div className="chat-placeholder-toast history-toast">{toast}</div>}
      </section>
    );
  }

  return (
    <section className="chat-history-overlay" aria-label="聊天记录">
      <header className="history-overlay-header">
        <button type="button" onClick={onClose} aria-label="关闭聊天记录">
          ×
        </button>
        <div>
          <strong>聊天记录</strong>
          <span>{results.length} 条</span>
        </div>
        <button type="button" onClick={exportJson} aria-label="导出聊天记录 JSON">
          <ExportIcon />
        </button>
      </header>

      <form
        className="history-search-panel"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <div className="history-search-row">
          <div className="history-keyword-shell">
            <SearchIcon />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索聊天记录" />
          </div>
          <button className="history-search-submit" type="submit" disabled={loading}>
            {loading ? "查找中" : "查找"}
          </button>
        </div>
        <div className="history-filter-grid">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="日期" />
          <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="角色筛选">
            <option value="all">全部</option>
            <option value="user">{displayNames.user}</option>
            <option value="assistant">{displayNames.assistant}</option>
          </select>
        </div>
      </form>

      <div
        className="history-result-list"
        ref={resultListRef}
        onScroll={() => {
          const list = resultListRef.current;
          if (list && list.scrollTop < 24 && cursor && !loading) runSearch({ append: true });
        }}
      >
        {cursor && (
          <button className="history-load-button" type="button" onClick={() => runSearch({ append: true })} disabled={loading}>
            {loading ? "查找中" : "更早"}
          </button>
        )}
        {!loading && !results.length && <p className="history-empty">没有记录。</p>}
        {resultGroups.map((group) => (
          <section className="history-result-day" key={group.key}>
            <div className="history-result-day-label">{group.label}</div>
            {group.items.map((message) => {
              const isUser = message.role === "user";
              return (
                <button
                  className={`history-result-card${isUser ? " is-user" : ""}`}
                  type="button"
                  key={message.id}
                  onClick={() => setSelectedMessageId(message.id)}
                >
                  <HistoryAvatar
                    role={message.role}
                    displayNames={displayNames}
                    avatarImages={avatarImages}
                    avatarOpacities={avatarOpacities}
                  />
                  <span className="history-result-card-body">
                    <span className="history-result-card-meta">
                      <strong>{roleLabel(message.role, displayNames)}</strong>
                      <time>{formatTimeOnly(message.createdAt)}</time>
                    </span>
                    <span className="history-result-bubble"><span>{getSnippet(message, keyword)}</span></span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
      {toast && <div className="chat-placeholder-toast history-toast">{toast}</div>}
    </section>
  );
}
