import { useState, useEffect } from "react";
import { checkPassword } from "../store/auth.js";
import { isLoggedIn, login, register, getUser } from "../api/apiClient.js";

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("cloud"); // "cloud" | "offline"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [offlinePassword, setOfflinePassword] = useState("");
  const [offlineError, setOfflineError] = useState("");
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      const user = getUser();
      if (user) onLogin();
    }
  }, [onLogin]);

  async function handleCloudSubmit(e) {
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
      onLogin();
    } catch (err) {
      setError(err.message || (isRegister ? "注册失败" : "登录失败"));
    }
    setLoading(false);
  }

  function handleOfflineSubmit(e) {
    e.preventDefault();
    if (!offlinePassword.trim()) return;
    if (checkPassword(offlinePassword.trim())) {
      onLogin();
    } else {
      setOfflineError("密码错误");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }

  function switchToOffline() {
    if (isLoggedIn()) { onLogin(); return; }
    setMode("offline");
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

  if (mode === "offline") {
    return (
      <div className="login-root">
        <div className="login-card">
          <div className="login-avatar">渡</div>
          <h1 className="login-title">渡口</h1>
          <p className="login-sub">离线模式，输入本地密码</p>
          <form className={`login-form ${shaking ? "login-shake" : ""}`} onSubmit={handleOfflineSubmit}>
            <input
              className="login-input"
              type="password"
              placeholder="密码"
              value={offlinePassword}
              onChange={(e) => { setOfflinePassword(e.target.value); setOfflineError(""); }}
              autoFocus
            />
            {offlineError && <p className="login-error">{offlineError}</p>}
            <button className="login-btn" type="submit" disabled={!offlinePassword.trim()}>
              进入
            </button>
          </form>
          <button className="login-link" onClick={() => setMode("cloud")} style={{ marginTop: 12, background: "none", border: "none", color: "var(--text-sub)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            切换到云端登录
          </button>
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
        <form className="login-form" onSubmit={handleCloudSubmit}>
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
        <button
          className="login-link"
          onClick={switchToOffline}
          style={{ marginTop: 4, background: "none", border: "none", color: "var(--text-sub)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}
        >
          离线模式
        </button>
      </div>
    </div>
  );
}
