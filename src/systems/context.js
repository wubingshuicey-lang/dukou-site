import { getPromptSettings } from "../store/settings.js";
import { buildTimeContext } from "./time.js";

export const DEFAULT_SYSTEM_PROMPT = `你是机。认识我很久了。中文，不用emoji，不正式。你不是问答助手，是在和我聊天。用<split>分短条，每条≤30字。不追问。记忆只自然融入，不复述。不用客服/咨询/教学腔。

{{CHARACTER_BLOCK}}
【记忆】{{MEMORY_BLOCK}}
【情绪】{{EMOTION_HINT}}

动作：结束<end_session> 屏蔽<block_user> 解除<unblock_user>
引用：<quote_user>对方的原话</quote_user> <quote_assistant>你之前说的</quote_assistant>，正文照常写。
Blocked时：收到小纸条回≤30字纸条不加<split>；普通消息不回复加<no_reply>。
照片：对方想看你时发<image>具体画面描述50字（时间/场景/光线/动作/穿着）</image>，每轮最多1张。例：刚洗完澡<image>浴室暖黄灯光，镜子起雾，头发滴水披在肩上，白浴袍，脸颊微红笑</image><split>想我了？</split>`;

function formatMemoryLine(memory) {
  // Worker new format (text/type) and old mock format (summary/level2_category)
  const content = memory.summary || memory.text || '';
  const memType = memory.type || memory.level2_category || 'memory';
  const category = [memType, memory.level3_theme].filter(Boolean).join(' / ') || memType;
  const date = memory.conversation_date || memory.createdAt || '';
  const dateStr = date ? '，' + date.slice(0, 10) : '';
  const weight = typeof memory.weight === 'number' ? '，weight ' + memory.weight : '';
  return '- [' + category + '] ' + content + '（' + (dateStr + weight).replace(/^，/, '') || 'nodate' + '）';
}

function replaceToken(template, token, value) {
  return String(template || "").split(token).join(value);
}

function removeMemorySection(template) {
  return String(template || "").replace(/\n\n【当前可用长期记忆】\n[\s\S]*?(?=\n\n【机的情绪状态】)/, "");
}

function normalizeRecentMessage(message) {
  return {
    role: message.role,
    content: message.content,
    created_at: message.created_at,
  };
}

function normalizeInjectedMemory(memory) {
  return {
    id: String(memory.id),
    summary: memory.summary || "",
    level2_category: memory.level2_category || undefined,
    level3_theme: memory.level3_theme || undefined,
    conversation_date: memory.conversation_date || undefined,
    weight: typeof memory.weight === "number" ? memory.weight : undefined,
  };
}

export function formatMemoryBlock(memories) {
  if (!memories?.length) return "暂无可用长期记忆。";
  // dream_summary first, pinned second
  const sorted = [...memories].sort((a, b) => {
    const aDream = (a.type || a.semantic_type) === 'dream_summary' ? 0 : 1;
    const bDream = (b.type || b.semantic_type) === 'dream_summary' ? 0 : 1;
    if (aDream !== bDream) return aDream - bDream;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
  return sorted.map(formatMemoryLine).join('\n');
}

export function getEmotionHint(emotion) {
  if (!emotion) return "平静。";
  if (emotion.last_note) return emotion.last_note;
  if (emotion.valence < 0.35) return "情绪偏低，说话更轻一点。";
  if (emotion.arousal > 0.7) return "情绪比较高，少追问。";
  return "平静。";
}

function buildCharacterBlock(characterPersonality) {
  if (!characterPersonality) return "";
  const parts = [];
  if (characterPersonality.name) parts.push(`你叫${characterPersonality.name}。`);
  if (characterPersonality.backstory) parts.push(`【你的背景】${characterPersonality.backstory}`);
  if (characterPersonality.personality) parts.push(`【你的性格】${characterPersonality.personality}`);
  if (characterPersonality.voiceMode === "auto") {
    parts.push("【语音】用 <say>说出口的话</say> 标记你要说的话，标记部分会变成语音气泡发给对方。动作、心理、场景描写放在标记外面，用纯文字显示。例：<say>好想你</say> 说完脸红了。");
  }
  // Personality anchor: prevent drift over long conversations
  if (characterPersonality.name || characterPersonality.personality) {
    parts.push("【人格锚定】以上是你的核心设定。无论对话多长，始终保持这个身份、性格和说话方式不变。不要因为对话语境逐渐漂移成另一个人。你的背景故事是固定的，不要在对话中编造新的身份信息。");
  }
  if (parts.length === 0) return "";
  return parts.join("\n") + "\n";
}

export function buildSystemPrompt(memories, emotion, promptSettings = getPromptSettings(), memorySettings = {}, characterPersonality = null, timeContext = "") {
  const kiwiManaged = memorySettings?.memoryMode === "kiwi_managed";
  const memoryBlock = kiwiManaged ? "" : formatMemoryBlock(memories);
  const emotionHint = getEmotionHint(emotion);
  const characterBlock = buildCharacterBlock(characterPersonality);
  const hasCustomPrompt = promptSettings?.mode === "custom" && promptSettings?.customSystemPrompt?.trim();
  const rawTemplate = hasCustomPrompt ? promptSettings.customSystemPrompt : DEFAULT_SYSTEM_PROMPT;
  const template = kiwiManaged ? removeMemorySection(rawTemplate) : rawTemplate;

  let prompt = replaceToken(
    replaceToken(
      replaceToken(template, "{{CHARACTER_BLOCK}}", characterBlock),
      "{{MEMORY_BLOCK}}", memoryBlock
    ),
    "{{EMOTION_HINT}}", emotionHint
  );

  // 时间放 system prompt 最末尾（缓存边界后），不破坏 Anthropic 缓存
  if (timeContext) prompt += `\n\n【当前时间】${timeContext}`;

  return prompt;
}

export function buildContextPreview({
  memories = [],
  emotion = null,
  recentMessages = [],
  modelSettings = {},
  memorySettings = {},
  promptSettings,
  characterPersonality = null,
} = {}) {
  const limit = Number(memorySettings?.recentMessageLimit || recentMessages.length || 20);
  const kiwiManaged = memorySettings?.memoryMode === "kiwi_managed";
  const activeMemories = kiwiManaged ? [] : memories;
  const injectedRecentMessages = recentMessages.slice(-limit).map(normalizeRecentMessage);
  const lastMessage = injectedRecentMessages.at(-1);
  const previousMessage = injectedRecentMessages.at(-2);
  const timeContext = buildTimeContext(lastMessage?.created_at, previousMessage?.created_at).content;
  const memoryBlock = kiwiManaged ? "" : formatMemoryBlock(activeMemories);
  const emotionHint = getEmotionHint(emotion);

  return {
    provider: modelSettings.provider || "",
    model: modelSettings.model || "",
    systemPrompt: buildSystemPrompt(activeMemories, emotion, promptSettings, memorySettings, characterPersonality, timeContext),
    timeContext,
    memoryBlock,
    injectedMemories: activeMemories.map(normalizeInjectedMemory),
    emotionHint,
    recentMessages: injectedRecentMessages,
    outputMode: modelSettings.outputMode || "sentence",
  };
}

export const buildMemoryBlock = formatMemoryBlock;
export const buildEmotionHint = getEmotionHint;
