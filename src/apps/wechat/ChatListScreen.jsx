import { getAcceptedCharacters, getPendingCharacters, acceptFriendRequest } from "../../store/characters.js";

export default function ChatListScreen({ onOpenChat, onBack }) {
  const characters = getAcceptedCharacters();
  const pending = getPendingCharacters();

  function handleAccept(charId) {
    const updated = acceptFriendRequest(charId);
    if (updated) {
      // Force re-render by refreshing the list
      window.dispatchEvent(new Event("dukou:characters-changed"));
    }
  }

  return (
    <div className="chatlist-root">
      <button className="chatlist-back-row" onClick={onBack}>
        ← 返回桌面
      </button>

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
              <button
                className="chatlist-friend-action accept"
                onClick={() => handleAccept(char.id)}
              >
                通过
              </button>
            </div>
          ))}
        </>
      )}

      <div className="chatlist-section-header">聊天</div>
      {characters.map((char) => (
        <button key={char.id} className="chatlist-item" onClick={() => onOpenChat(char)}>
          <div className="chatlist-avatar" style={{ background: char.avatarColor }}>
            {char.avatarInitial}
          </div>
          <div className="chatlist-info">
            <div className="chatlist-name">{char.name}</div>
            <div className="chatlist-preview">{char.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
