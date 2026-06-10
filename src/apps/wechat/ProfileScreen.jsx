export default function ProfileScreen({ onOpenSubPage, onLogout }) {
  return (
    <div className="profile-root">
      <div className="profile-header">
        <div className="profile-avatar">我</div>
        <div>
          <div className="profile-name">我</div>
          <div className="profile-id">微信号: dukou_user</div>
        </div>
      </div>

      <div className="profile-section">
        <button className="profile-row" onClick={() => onOpenSubPage("characterCreate")}>
          <span>创建角色</span>
          <span className="profile-row-arrow">›</span>
        </button>
        <div className="profile-row">
          <span>我的朋友圈</span>
          <span className="profile-row-arrow">›</span>
        </div>
        <div className="profile-row">
          <span>收藏</span>
          <span className="profile-row-arrow">›</span>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-row">
          <span>设置</span>
          <span className="profile-row-arrow">›</span>
        </div>
        <button className="profile-row" onClick={onLogout}>
          <span>退出登录</span>
          <span className="profile-row-arrow">›</span>
        </button>
      </div>
    </div>
  );
}
