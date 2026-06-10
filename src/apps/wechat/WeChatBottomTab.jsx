const TABS = [
  { id: "chatList", label: "微信" },
  { id: "contacts", label: "通讯录" },
  { id: "moments", label: "发现" },
  { id: "profile", label: "我" },
];

export default function WeChatBottomTab({ activeTab, onChange }) {
  return (
    <div className="wechat-bottombar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`wechat-tab-item ${activeTab === tab.id ? "wechat-tab-active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="wechat-tab-label" style={{ fontSize: 13, fontWeight: activeTab === tab.id ? 500 : 400 }}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
