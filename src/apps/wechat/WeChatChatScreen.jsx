import { useState, useCallback } from "react";
import Chat from "../../pages/Chat.jsx";
import { getCharacter, getCharacterModelSettings } from "../../store/characters.js";

export default function WeChatChatScreen({ character, onBack }) {
  const [char, setChar] = useState(character);
  const [modelSettings, setModelSettings] = useState(() =>
    getCharacterModelSettings(character.id)
  );

  const refreshSettings = useCallback(() => {
    const fresh = getCharacter(character.id);
    if (fresh) setChar(fresh);
    setModelSettings(getCharacterModelSettings(character.id));
  }, [character.id]);

  return (
    <Chat
      chatSpaceId={char.chatSpaceId}
      characterId={char.id}
      characterName={char.name}
      characterPersonality={char.personality}
      characterBackstory={char.backstory}
      characterModelSettings={modelSettings}
      characterVoiceId={char.voiceId}
      characterVoiceApiKey={char.elevenlabsApiKey || char.modelApiKey}
      characterVoiceMode={char.voiceMode || "off"}
      characterTtsEnabled={char.ttsEnabled}
      characterSttEnabled={char.sttEnabled}
      onCharacterSettingsSaved={refreshSettings}
      onBack={onBack}
    />
  );
}
