import { useState, useRef, useEffect } from "react";
import { getModelSettings } from "../../store/settings.js";
import { callOpenAICompatible } from "../../api/providers/openaiCompatible.js";

const STORY_SYSTEM = `你是一个互动故事叙述者。你为用户创造沉浸式的文字冒险。

规则：
- 用中文叙述，有画面感，每次300字以内
- 在段落结尾提供一个清晰的场景状态和2-4个可选行动方向
- 可选行动用 <choice>行动描述</choice> 标记，每行一个
- 用户可以用自然语言描述自己的行动，不一定要选你给的选项
- 保持故事连贯，记住之前发生过的事
- 故事有明确的推进感，不要原地打转
- 风格：文学性强，但不晦涩；可以悬疑、浪漫、奇幻、日常，根据故事走向自然切换`;

function StoryBubble({ role, content }) {
  const isSystem = role === "assistant";
  return (
    <div style={{
      marginBottom: 16,
      display: "flex",
      flexDirection: isSystem ? "row" : "row-reverse",
      alignItems: "flex-end",
      gap: 8,
    }}>
      <div style={{
        maxWidth: "80%",
        padding: "10px 14px",
        borderRadius: isSystem ? "14px 14px 14px 3px" : "14px 14px 3px 14px",
        border: isSystem ? "1px solid var(--border-color)" : "none",
        background: isSystem ? "var(--bubble-du)" : "var(--bubble-user)",
        color: isSystem ? "var(--text-main)" : "#fff",
        fontSize: 13,
        lineHeight: 1.8,
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </div>
    </div>
  );
}

export default function StoryView() {
  const [scene, setScene] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const appendMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const callStoryAI = async (userMessage) => {
    const settings = getModelSettings();
    if (!settings.apiKey) {
      setError("请先在设置里填写 API Key");
      return "";
    }

    try {
      const recentMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const allMessages = [
        ...recentMessages,
        { role: "user", content: userMessage },
      ];

      const response = await callOpenAICompatible({
        messages: allMessages,
        systemPrompt: STORY_SYSTEM,
        settings: { ...settings, temperature: 0.9, maxTokens: 600 },
      });

      return response?.text || "";
    } catch (err) {
      setError(err.message || "请求失败");
      return "";
    }
  };

  const handleStart = async (prompt) => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    const userMsg = prompt === "__default__"
      ? "开始一段新的故事。请设定一个引人入胜的开场场景。"
      : prompt;

    appendMessage("user", prompt === "__default__" ? "开始故事" : prompt);
    const reply = await callStoryAI(userMsg);
    if (reply) {
      appendMessage("assistant", reply);
    }
    setStarted(true);
    setScene("");
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);
    setError("");
    appendMessage("user", userMsg);
    const reply = await callStoryAI(userMsg);
    if (reply) {
      appendMessage("assistant", reply);
    }
    setLoading(false);
  };

  const handleChoice = (choice) => {
    setInput(choice);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!started ? (
        <div style={{ padding: "24px 16px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>互动故事</h2>
          <p style={{ fontSize: 12, color: "var(--text-sub)", lineHeight: 1.7, margin: "0 0 20px" }}>
            进入一个由 AI 叙述的互动故事。你可以自由行动，选择自己的冒险之路。
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "悬疑夜行", prompt: "开始一段悬疑故事。我在深夜的城市里醒来，记忆模糊，手心里有一张写着地址的纸条。" },
              { label: "异世界旅途", prompt: "开始一段奇幻故事。我是一个无意中穿越到异世界的普通人，周围的一切都陌生而奇妙。" },
              { label: "日常之诗", prompt: "开始一段日常故事。一个普通的下午，窗外有光，我想起了很久以前的一件事。" },
              { label: "自定义开头", prompt: "__custom__" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.prompt === "__custom__") {
                    setStarted(true);
                  } else {
                    handleStart(item.prompt);
                  }
                }}
                style={{
                  padding: "12px 16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  background: "var(--panel-bg)",
                  color: "var(--text-main)",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 14px" }}>
            {messages.length === 0 && (
              <div style={{ padding: 20 }}>
                <textarea
                  value={scene}
                  onChange={(e) => setScene(e.target.value)}
                  placeholder="写下你想要的故事开头……"
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    outline: 0,
                    background: "var(--panel-bg)",
                    color: "var(--text-main)",
                    fontSize: 14,
                    lineHeight: 1.7,
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => handleStart(scene || "__default__")}
                  disabled={loading}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    padding: "10px 0",
                    border: 0,
                    borderRadius: 10,
                    background: loading ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154, 170, 181, 0.78))",
                    color: "#fff",
                    fontSize: 14,
                    cursor: loading ? "default" : "pointer",
                    fontFamily: "inherit",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  开始
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <StoryBubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && (
              <div style={{ textAlign: "center", padding: 12, color: "var(--text-sub)", fontSize: 12 }}>
                故事正在展开……
              </div>
            )}
            {error && (
              <div style={{ padding: 10, color: "var(--danger)", fontSize: 12, textAlign: "center" }}>
                {error}
              </div>
            )}
          </div>

          <div style={{
            flexShrink: 0,
            display: "flex",
            gap: 8,
            padding: "10px 14px",
            borderTop: "1px solid var(--border-color)",
            background: "var(--shell-bg)",
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入你的行动……"
              disabled={loading}
              style={{
                flex: 1,
                minWidth: 0,
                border: "1px solid var(--border-color)",
                borderRadius: 20,
                outline: 0,
                background: "var(--input-bg)",
                color: "var(--text-main)",
                fontSize: 13,
                padding: "8px 14px",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                border: 0,
                borderRadius: "50%",
                background: "var(--accent-warm)",
                color: "#fff",
                fontSize: 18,
                cursor: loading || !input.trim() ? "default" : "pointer",
                display: "grid",
                placeItems: "center",
                opacity: loading || !input.trim() ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M1.5 8.5L14.5 2L8.5 14.5L6.8 9.2L1.5 8.5Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
