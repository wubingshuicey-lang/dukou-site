import { useState, useEffect } from "react";
import { isLoggedIn, login, register, getUser } from "../api/apiClient.js";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser();
      if (user) onLogin();
    }
  }, [onLogin]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await register(username.trim(), password.trim());
      } else {
        await login(username.trim(), password.trim());
      }
      // 清理旧版「离线模式」遗留的明文密码（迁移用，可安全保留）
      localStorage.removeItem("dukou:auth");
      onLogin();
    } catch (err) {
      setError(err.message || (isRegister ? "注册失败" : "登录失败"));
    }
    setLoading(false);
  }

  if (isLoggedIn() && getUser()) {
    return (
      <div className="login-root">
        <div className="login-card">
          <div className="login-avatar">渡</div>
          <h1 className="login-title">渡口</h1>
          <p className="login-sub">{getUser().username}，已登录</p>
          <button className="login-btn" onClick={onLogin}>进入</button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-avatar">渡</div>
        <h1 className="login-title">渡口</h1>
        <p className="login-sub">{isRegister ? "注册账号" : "云端登录"}</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            autoFocus
            style={{ marginBottom: 8 }}
          />
          <input
            className="login-input"
            type="password"
            placeholder="密码（至少6位）"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" type="submit" disabled={!username.trim() || !password.trim() || loading}>
            {loading ? "请稍候..." : isRegister ? "注册" : "登录"}
          </button>
        </form>
        <button
          className="login-link"
          onClick={() => { setIsRegister(!isRegister); setError(""); }}
          style={{ marginTop: 8, background: "none", border: "none", color: "var(--text-sub)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
        >
          {isRegister ? "已有账号？去登录" : "没有账号？注册一个"}
        </button>
      </div>
    </div>
  );
}
