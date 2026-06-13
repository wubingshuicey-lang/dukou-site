import { useEffect, useState } from "react";
import { getMemoryDrawerState, hideMemory } from "../api/memory.js";
import { isLoggedIn, fetchMemories, pinMemory, unpinMemory } from "../api/apiClient.js";

export default function MemoryDrawer({ open, onClose, chatSpaceId = "main" }) {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("mock");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!open) return undefined;

    setLoading(true);

    // 优先从 Worker 拉真记忆，降级用 mock
    if (isLoggedIn() && chatSpaceId) {
      fetchMemories(chatSpaceId, 30)
        .then((workerItems) => {
          if (!ignore) {
            // 按 pinned 优先排序
            const sorted = [...(workerItems || [])].sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return (b.heat || 0) - (a.heat || 0);
            });
            setMode("worker");
            setItems(sorted);
            setMessage("");
            setLoading(false);
          }
        })
        .catch(() => {
          // Worker 失败，回退 mock
          getMemoryDrawerState(30).then((state) => {
            if (!ignore) {
              setMode(state.mode);
              setMessage(state.message || "");
              setItems(state.items || []);
              setLoading(false);
            }
          });
        });
    } else {
      getMemoryDrawerState(30).then((state) => {
        if (!ignore) {
          setMode(state.mode);
          setMessage(state.message || "");
          setItems(state.items || []);
          setLoading(false);
        }
      });
    }

    return () => { ignore = true; };
  }, [open, chatSpaceId]);

  if (!open) return null;

  const archive = async (id) => {
    await hideMemory(id);
    setItems((current) => current.filter((item) => String(item.id) !== String(id)));
  };

  const togglePin = async (memory) => {
    if (!chatSpaceId) return;
    try {
      if (memory.pinned) {
        await unpinMemory(chatSpaceId, memory.id);
      } else {
        await pinMemory(chatSpaceId, memory.id);
      }
      setItems((current) =>
        current.map((item) =>
          String(item.id) === String(memory.id)
            ? { ...item, pinned: !item.pinned }
            : item
        )
      );
    } catch {}
  };

  // 兼容新旧字段格式
  const getText = (m) => m.text || m.summary || "";
  const getType = (m) => m.type || m.semantic_type || m.level2_category || "记忆";
  const getDate = (m) => m.createdAt || m.created_at || m.conversation_date || "";
  const getHeat = (m) => (typeof m.heat === "number" ? Math.round(m.heat * 100) : null);
  const getImportance = (m) => (typeof m.importance === "number" ? Math.round(m.importance * 100) : null);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="memory-drawer" aria-label="记忆抽屉">
        <div className="drawer-header">
          <strong>机记得的事</strong>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭记忆抽屉">
            ×
          </button>
        </div>
        <div className="drawer-list">
          {loading && <div className="empty-note">读取中</div>}
          {!loading && mode === "kiwi_managed" && <div className="empty-note">{message}</div>}
          {!loading && mode !== "kiwi_managed" && items.length === 0 && (
            <div className="empty-note">暂无记忆</div>
          )}
          {items.map((memory) => (
            <article className={"memory-card" + (memory.pinned ? " memory-card--pinned" : "")} key={memory.id}>
              <div className="memory-card-head">
                <span className="memory-tag">{getType(memory)}</span>
                <span className="memory-card-actions">
                  {mode === "worker" && (
                    <button
                      className={"pin-button" + (memory.pinned ? " pin-button--active" : "")}
                      type="button"
                      onClick={() => togglePin(memory)}
                      title={memory.pinned ? "取消锁定" : "锁定记忆"}
                    >
                      {memory.pinned ? "📌" : "📍"}
                    </button>
                  )}
                  {mode === "mock" && (
                    <button className="ghost-button" type="button" onClick={() => archive(memory.id)}>
                      归档
                    </button>
                  )}
                </span>
              </div>
              <p>{getText(memory)}</p>
              <div className="memory-card-meta">
                {getDate(memory) && <time>{getDate(memory).slice(0, 10)}</time>}
                {getHeat(memory) !== null && (
                  <span className="memory-heat" title={`热度 ${getHeat(memory)}%`}>
                    {getHeat(memory) > 70 ? "🔥" : getHeat(memory) > 30 ? "🕯️" : "❄️"} {getHeat(memory)}%
                  </span>
                )}
                {getImportance(memory) !== null && getImportance(memory) > 70 && (
                  <span className="memory-importance">⭐ {getImportance(memory)}%</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
