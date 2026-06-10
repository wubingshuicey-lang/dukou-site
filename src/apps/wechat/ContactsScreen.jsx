import { getAcceptedCharacters } from "../../store/characters.js";

export default function ContactsScreen({ onOpenChat }) {
  const characters = getAcceptedCharacters();

  return (
    <div className="chatlist-root">
      <div className="chatlist-section-header">我的好友</div>
      {characters.map((char) => (
        <button key={char.id} className="chatlist-item" onClick={() => onOpenChat(char)}>
          <div className="chatlist-avatar">{char.avatarInitial}</div>
          <div className="chatlist-info">
            <div className="chatlist-name">{char.name}</div>
            <div className="chatlist-preview">{char.description}</div>
          </div>
          <span className="chatlist-time" style={{ color: "var(--text-sub)", fontSize: 13 }}>
            发消息 ›
          </span>
        </button>
      ))}
    </div>
  );
}
