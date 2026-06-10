import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import DesktopScreen from "./pages/DesktopScreen.jsx";
import WeChatApp from "./apps/WeChatApp.jsx";
import FunctionPage from "./pages/FunctionPage.jsx";
import Settings from "./pages/Settings.jsx";
import CharacterCreatePage from "./pages/CharacterCreatePage.jsx";
import BeyondApp from "./apps/BeyondApp.jsx";
import GalleryApp from "./apps/GalleryApp.jsx";
import { loadCloudSettings } from "./store/settings.js";
import { loadCloudCharacters } from "./store/characters.js";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [activeApp, setActiveApp] = useState(null);
  const [subPage, setSubPage] = useState(null);

  useEffect(() => {
    if (screen !== "login") {
      (async () => {
        await loadCloudSettings().catch(() => {});
        await loadCloudCharacters().catch(() => {});
      })();
    }
  }, [screen]);

  function handleOpenApp(appId) {
    setActiveApp(appId);
    setScreen("app");
  }

  function handleCloseApp() {
    setActiveApp(null);
    setSubPage(null);
    setScreen("desktop");
  }

  function handleOpenSubPage(page) {
    setSubPage(page);
  }

  function handleCloseSubPage() {
    setSubPage(null);
  }

  function renderApp() {
    if (subPage === "characterCreate") {
      return <CharacterCreatePage onBack={handleCloseSubPage} />;
    }

    switch (activeApp) {
      case "wechat":
        return <WeChatApp onBack={handleCloseApp} onOpenSubPage={handleOpenSubPage} />;
      case "function":
        return (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <button
              onClick={handleCloseApp}
              style={{
                margin: "8px 12px",
                background: "var(--panel-bg)",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
                color: "var(--text-sub)",
                fontFamily: "inherit",
                alignSelf: "flex-start",
              }}
            >
              ← 桌面
            </button>
            <div style={{ flex: 1, overflow: "auto" }}>
              <FunctionPage />
            </div>
          </div>
        );
      case "gallery":
        return <GalleryApp onBack={handleCloseApp} />;
      case "beyond":
        return <BeyondApp onBack={handleCloseApp} />;
      case "settings":
        return (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <button
              onClick={handleCloseApp}
              style={{
                margin: "8px 12px",
                background: "var(--panel-bg)",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
                color: "var(--text-sub)",
                fontFamily: "inherit",
                alignSelf: "flex-start",
              }}
            >
              ← 桌面
            </button>
            <div style={{ flex: 1, overflow: "auto" }}>
              <Settings />
            </div>
          </div>
        );
      default:
        return <DesktopScreen onOpenApp={handleOpenApp} />;
    }
  }

  return (
    <div className="app-backdrop">
      <main className="phone-shell" aria-label="渡口">
        {screen === "login" && <LoginPage onLogin={() => setScreen("desktop")} />}
        {screen === "desktop" && <DesktopScreen onOpenApp={handleOpenApp} />}
        {screen === "app" && (
          <div className="page-host">
            {renderApp()}
          </div>
        )}
      </main>
    </div>
  );
}
