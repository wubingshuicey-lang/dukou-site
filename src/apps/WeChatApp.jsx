import { useState } from "react";
import WeChatTopBar from "./wechat/WeChatTopBar.jsx";
import WeChatBottomTab from "./wechat/WeChatBottomTab.jsx";
import ChatListScreen from "./wechat/ChatListScreen.jsx";
import ContactsScreen from "./wechat/ContactsScreen.jsx";
import WeChatChatScreen from "./wechat/WeChatChatScreen.jsx";
import MomentsScreen from "./wechat/MomentsScreen.jsx";
import ProfileScreen from "./wechat/ProfileScreen.jsx";

export default function WeChatApp({ onBack, onOpenSubPage, forceView }) {
  const [view, setView] = useState(forceView || "chatList");
  const [activeChatChar, setActiveChatChar] = useState(null);

  const currentView = forceView || view;

  function handleOpenChat(character) {
    setActiveChatChar(character);
    setView("chat");
  }

  function handleBackFromChat() {
    setActiveChatChar(null);
    setView("chatList");
  }

  function handleTabChange(tabId) {
    setView(tabId);
    setActiveChatChar(null);
  }

  function renderContent() {
    if (currentView === "chat" && activeChatChar) {
      return <WeChatChatScreen character={activeChatChar} onBack={handleBackFromChat} />;
    }
    switch (currentView) {
      case "chatList":
        return <ChatListScreen onOpenChat={handleOpenChat} onBack={onBack} />;
      case "contacts":
        return <ContactsScreen onOpenChat={handleOpenChat} />;
      case "moments":
        return <MomentsScreen />;
      case "profile":
        return <ProfileScreen onOpenSubPage={onOpenSubPage} onLogout={onBack} />;
      default:
        return <ChatListScreen onOpenChat={handleOpenChat} onBack={onBack} />;
    }
  }

  function getTopBarTitle() {
    if (currentView === "chat" && activeChatChar) return activeChatChar.name;
    if (currentView === "contacts") return "通讯录";
    if (currentView === "moments") return "朋友圈";
    if (currentView === "profile") return "我";
    return "微信";
  }

  function showTopBarBack() {
    return currentView === "chat";
  }

  function handleTopBarBack() {
    if (currentView === "chat") handleBackFromChat();
  }

  return (
    <div className="wechat-root">
      <WeChatTopBar
        title={getTopBarTitle()}
        onBack={showTopBarBack() ? handleTopBarBack : undefined}
      />
      <div className="wechat-content">
        {renderContent()}
      </div>
      {currentView !== "chat" && (
        <WeChatBottomTab activeTab={currentView} onChange={handleTabChange} />
      )}
    </div>
  );
}
