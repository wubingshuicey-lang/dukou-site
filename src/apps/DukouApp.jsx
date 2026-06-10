import { useState, useEffect } from "react";
import Entry from "../pages/Entry.jsx";
import Chat from "../pages/Chat.jsx";
import Settings from "../pages/Settings.jsx";
import FunctionPage from "../pages/FunctionPage.jsx";
import BottomNav from "../components/BottomNav.jsx";

export default function DukouApp({ onBack }) {
  const [screen, setScreen] = useState("entry");
  const [activeTab, setActiveTab] = useState("chat");
  const [hideFunctionBottomNav, setHideFunctionBottomNav] = useState(false);
  const [pendingChatQuote, setPendingChatQuote] = useState(null);

  useEffect(() => {
    if (activeTab !== "function") {
      setHideFunctionBottomNav(false);
    }
  }, [activeTab]);

  function openChatWithQuote(quote) {
    setPendingChatQuote({
      ...quote,
      id: `quote-${Date.now()}`,
    });
    setActiveTab("chat");
  }

  return (
    <div className="page-host" style={{ position: "relative" }}>
      {/* Back to desktop button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          top: 8,
          left: 12,
          zIndex: 20,
          background: "var(--panel-bg)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: 12,
          cursor: "pointer",
          color: "var(--text-sub)",
          fontFamily: "inherit",
        }}
      >
        ← 桌面
      </button>

      {screen === "entry" ? (
        <Entry onEnter={() => setScreen("main")} />
      ) : (
        <>
          <div className="page-host">
            {activeTab === "chat" && (
              <Chat
                pendingQuote={pendingChatQuote}
                onPendingQuoteAccepted={() => setPendingChatQuote(null)}
                onOpenSettings={() => setActiveTab("settings")}
                onOpenFunction={() => setActiveTab("function")}
              />
            )}
            {activeTab === "function" && (
              <FunctionPage
                onDetailOverlayChange={setHideFunctionBottomNav}
                onOpenChatWithQuote={openChatWithQuote}
              />
            )}
            {activeTab === "settings" && <Settings />}
          </div>
          {activeTab !== "chat" && !(activeTab === "function" && hideFunctionBottomNav) && (
            <BottomNav activeTab={activeTab} onChange={setActiveTab} />
          )}
        </>
      )}
    </div>
  );
}
