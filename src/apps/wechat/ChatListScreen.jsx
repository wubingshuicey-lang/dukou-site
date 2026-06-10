import { useState, useRef } from "react";
import { getAcceptedCharacters, getPendingCharacters, acceptFriendRequest, isUserBlocked, toggleUserBlock } from "../../store/characters.js";

export default function ChatListScreen({ onOpenChat, onBack }) {
  const [refresh, setRefresh] = useState(0);
  const characters = getAcceptedCharacters();
  const pending = getPendingCharacters();
  const [swipedId, setSwipedId] = useState(null);
  const touchStart = useRef({ x: 0, y: 0, id: null });

  function forceRefresh() { setRefresh((r) => r + 1); }

  function handleAccept(charId) {
    const updated = acceptFriendRequest(charId);
    if (updated) window.dispatchEvent(new Event("dukou:characters-changed"));
  }

  function handleToggleBlock(charId) {
    toggleUserBlock(charId);
    setSwipedId(null);
    forceRefresh();
  }

  function onTouchStart(e, charId) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, id: charId };
  }

  function onTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const { x: startX, y: startY, id } = touchStart.current;
    const dx = endX - startX;
    const dy = endY - startY;

    // Only trigger swipe if horizontal movement > vertical
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) setSwipedId(id); // swipe left → reveal
      else setSwipedId(null); // swipe right → dismiss
    }
  }

  return (
    <div className="chatlist-root">
      <div className="chatlist-back-row" onClick={onBack} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
        ← 返回桌面
      </div>

      {pending.length > 0 && (
        <>
          <div className="chatlist-section-header">新的朋友</div>
          {pending.map((char) => (
            <div key={char.id} className="chatlist-item" style={{ cursor: "default" }}>
              <div className="chatlist-avatar pending">{char.avatarInitial}</div>
              <div className="chatlist-info">
                <div className="chatlist-name">{char.name}</div>
                <div className="chatlist-preview">{char.description}</div>
              </div>
              <button className="chatlist-friend-action accept" onClick={() => handleAccept(char.id)}>
                通过
              </button>
            </div>
          ))}
        </>
      )}

      <div className="chatlist-section-header">聊天</div>
      {characters.map((char) => {
        const blocked = isUserBlocked(char.id);
        const swiped = swipedId === char.id;
        return (
          <div
            key={char.id}
            className="chatlist-swipe-wrapper"
            style={{ position: "relative", overflow: "hidden" }}
            onTouchStart={(e) => onTouchStart(e, char.id)}
            onTouchEnd={onTouchEnd}
          >
            {/* Action behind */}
            <button
              onClick={() => handleToggleBlock(char.id)}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 80,
                border: 0,
                borderRadius: 0,
                background: blocked ? "var(--accent-cold)" : "var(--danger)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 0,
              }}
            >
              {blocked ? "解除" : "拉黑"}
            </button>
            {/* Content slides left */}
            <button
              className="chatlist-item"
              onClick={() => {
                if (swiped) { setSwipedId(null); return; }
                onOpenChat(char);
              }}
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                transform: swiped ? "translateX(-80px)" : "translateX(0)",
                transition: "transform 0.2s ease",
                background: "var(--panel-bg)",
                border: 0,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div className="chatlist-avatar" style={{ background: char.avatarColor }}>
                {char.avatarInitial}
              </div>
              <div className="chatlist-info" style={{ flex: 1 }}>
                <div className="chatlist-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {char.name}
                  {blocked && (
                    <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 500 }}>已拉黑</span>
                  )}
                </div>
                <div className="chatlist-preview">{char.description}</div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
