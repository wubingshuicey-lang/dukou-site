import { useState, useEffect, useRef } from "react";
import { getLatestMessages, saveMessage } from "../api/messageArchive.js";
import { formatTime } from "../systems/time.js";
import { getModelSettings } from "../store/settings.js";
import { generateImage } from "../api/providers/imageGeneration.js";

const IMAGE_MODELS = [
  { id: "openai/gpt-image-2", label: "GPT Image 2" },
  { id: "sapiens-ai/agnes-image-1.2", label: "Agnes Image 1.2" },
];

function getChatSpaceLabel(id) {
  if (id === "main") return "微聊";
  if (id?.startsWith("char_")) return "角色";
  return id || "微聊";
}

export default function GalleryApp({ onBack }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genModel, setGenModel] = useState("openai/gpt-image-2");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const [genResult, setGenResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const messages = await getLatestMessages(200, { includeExcluded: false });
        if (cancelled) return;
        const withImages = messages
          .filter((m) => {
            const hasImg = m.imageUrl || m.meta?.imageUrl;
            if (!hasImg) return false;
            // AI-generated images only show if user saved them
            if (m.meta?.source === "ai_generated") return m.meta?.savedToGallery === true;
            return true;
          })
          .map((m) => ({
            id: m.id,
            imageUrl: m.imageUrl || m.meta?.imageUrl,
            content: m.content || "",
            created_at: m.created_at || m.createdAt,
            role: m.role,
            conversationId: m.conversationId || m.chatSpaceId || "main",
            authorName: m.role === "user" ? "我" : (m.meta?.senderName || "机"),
          }))
          .reverse();
        setImages(withImages);
      } catch {
        // Gallery is best-effort; empty state is fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenLoading(true);
    setGenError("");
    setGenResult(null);

    try {
      const settings = getModelSettings();
      if (!settings.apiKey) {
        setGenError("请先在设置里填写 API Key");
        setGenLoading(false);
        return;
      }

      const imageUrl = await generateImage({
        prompt: genPrompt.trim(),
        settings: { ...settings, imageModel: genModel },
      });

      setGenResult(imageUrl);

      // Save to message archive so it persists in gallery
      await saveMessage({
        role: "user",
        content: genPrompt.trim(),
        imageUrl,
        meta: { source: "gallery_generation", model: genModel },
        conversationId: "main",
      });

      // Add to local state immediately
      setImages((prev) => [
        {
          id: `gen-${Date.now()}`,
          imageUrl,
          content: genPrompt.trim(),
          created_at: new Date().toISOString(),
          role: "user",
          conversationId: "main",
          authorName: "我",
        },
        ...prev,
      ]);
    } catch (err) {
      setGenError(err.message || "生成失败");
    } finally {
      setGenLoading(false);
    }
  };

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
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--text-sub)",
            fontFamily: "inherit",
          }}
        >
          ← 桌面
        </button>
        <strong style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>相册</strong>
        <button
          onClick={() => { setGenOpen(!genOpen); setGenError(""); setGenResult(null); }}
          style={{
            border: "1px solid var(--accent-cold)",
            borderRadius: 8,
            background: genOpen ? "var(--highlight-bg)" : "transparent",
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            color: "var(--accent-cold)",
            fontFamily: "inherit",
          }}
        >
          {genOpen ? "收起" : "生成"}
        </button>
      </div>

      {genOpen && (
        <div style={{
          flexShrink: 0,
          padding: "14px 14px 0",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--shell-bg)",
        }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-sub)", marginBottom: 4 }}>
              选择生图模型
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {IMAGE_MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setGenModel(m.id)}
                  style={{
                    padding: "4px 10px",
                    border: genModel === m.id ? "2px solid var(--accent-cold)" : "1px solid var(--border-color)",
                    borderRadius: 6,
                    background: genModel === m.id ? "var(--highlight-bg)" : "var(--panel-bg)",
                    color: "var(--text-main)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
            placeholder="描述你想要的画面……"
            rows={2}
            style={{
              width: "100%",
              resize: "vertical",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              outline: 0,
              background: "var(--panel-bg)",
              color: "var(--text-main)",
              fontSize: 13,
              lineHeight: 1.7,
              padding: "8px 10px",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={genLoading || !genPrompt.trim()}
            style={{
              width: "100%",
              marginTop: 8,
              marginBottom: 14,
              padding: "10px 0",
              border: 0,
              borderRadius: 10,
              background: genLoading ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154, 170, 181, 0.78))",
              color: "#fff",
              fontSize: 14,
              cursor: genLoading || !genPrompt.trim() ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: genLoading || !genPrompt.trim() ? 0.5 : 1,
            }}
          >
            {genLoading ? "生成中……" : "生成图片"}
          </button>

          {genError && (
            <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 14 }}>
              {genError}
            </div>
          )}

          {genResult && (
            <div style={{ marginBottom: 14, textAlign: "center" }}>
              <img
                src={genResult}
                alt="生成结果"
                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
              />
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 12px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-sub)", fontSize: 13 }}>
            翻看中……
          </div>
        )}

        {!loading && images.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--text-sub)" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🖼</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>还没有照片</div>
            <div style={{ fontSize: 11, lineHeight: 1.7 }}>
              点击右上角「生成」创建第一张图片
            </div>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
        }}>
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setPreview(img)}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                overflow: "hidden",
                background: "var(--panel-soft-bg)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <img
                src={img.imageUrl}
                alt={img.content || "图片"}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            background: "rgba(0, 0, 0, 0.85)",
            padding: "16px",
          }}
        >
          <button
            onClick={() => setPreview(null)}
            style={{
              alignSelf: "flex-end",
              width: 36,
              height: 36,
              border: 0,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
              fontSize: 22,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              marginBottom: 12,
            }}
          >
            ×
          </button>
          <div style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            placeItems: "center",
          }}>
            <img
              src={preview.imageUrl}
              alt={preview.content || "图片"}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 6,
              }}
            />
          </div>
          <div style={{
            flexShrink: 0,
            padding: "12px 4px 4px",
            color: "#ccc",
            fontSize: 11,
            textAlign: "center",
            lineHeight: 1.6,
          }}>
            {preview.content && (
              <div style={{ marginBottom: 4, fontSize: 13, color: "#eee" }}>
                {preview.content.slice(0, 60)}
              </div>
            )}
            <div>
              {formatTime(preview.created_at)} · {preview.authorName} · {getChatSpaceLabel(preview.conversationId)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
