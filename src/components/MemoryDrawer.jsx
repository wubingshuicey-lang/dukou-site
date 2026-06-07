import { useEffect, useState } from "react";
import { getMemoryDrawerState, hideMemory } from "../api/memory.js";

export default function MemoryDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("mock");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!open) return undefined;

    setLoading(true);
    getMemoryDrawerState(30).then((state) => {
      if (!ignore) {
        setMode(state.mode);
        setMessage(state.message || "");
        setItems(state.items || []);
        setLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [open]);

  if (!open) return null;

  const archive = async (id) => {
    await hideMemory(id);
    setItems((current) => current.filter((item) => String(item.id) !== String(id)));
  };

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
          {!loading && mode !== "kiwi_managed" && items.length === 0 && <div className="empty-note">暂无记忆</div>}
          {items.map((memory) => (
            <article className="memory-card" key={memory.id}>
              <div className="memory-card-head">
                <span className="memory-tag">{memory.level3_theme || memory.level2_category || "记忆"}</span>
                {mode === "mock" && (
                  <button className="ghost-button" type="button" onClick={() => archive(memory.id)}>
                    归档
                  </button>
                )}
              </div>
              <p>{memory.summary}</p>
              {memory.conversation_date && <time>{memory.conversation_date}</time>}
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
