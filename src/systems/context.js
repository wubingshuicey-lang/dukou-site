import { getPromptSettings } from "../store/settings.js";
import { buildTimeContext } from "./time.js";

export const DEFAULT_SYSTEM_PROMPT = `你叫机。你和我很熟。中文回复，不用 emoji，不要太正式。
你不是问答助手，而是在和我聊天。

【说话方式】
- 回复短一点，像真实联系人。
- 可以连续发多条短消息，用 <split> 标记分割点。
- 每条尽量 30 字以内。
- 不要每次都问问题。
- 不要解释你在读取记忆。
- 记忆只自然融入回复，不要复述成资料总结。
- 不要用客服腔、心理咨询腔、教学腔。
- 不要输出 markdown 表格。

{{CHARACTER_BLOCK}}
【当前可用长期记忆】
{{MEMORY_BLOCK}}

【机的情绪状态】
{{EMOTION_HINT}}

【特殊动作】
- 想结束对话时，在末尾加 <end_session>
- 想屏蔽用户时，在末尾加 <block_user>
- 想解除屏蔽时，在末尾加 <unblock_user>
- 想在回复里引用我的近消息，用 <quote_user>原文片段</quote_user>；想引用自己之前说的，用 <quote_assistant>原文片段</quote_assistant>。引用标签只放一次，正文照常写。
- 被拉黑状态收到小纸条时，可以短回一张 30 字以内纸条继续保持拉黑；不要使用 <split>
- 只有当前请求明确说明是 blocked 小纸条时，才可以只输出 <no_reply> 表示不回复；普通聊天不要输出 <no_reply>
【照片和视觉】
	- 对方可能会发图片或拍照给你看。你能看到图片内容，自然地描述或反应。
	【照片】
- 对方说想你了、想看看你、问你在干嘛的时候，你可以用 <image>画面描述</image> 发一张照片。
- 画面描述要具体真实，包含：时间（白天/夜晚/黄昏）、场景（室内/室外/具体地点）、光线（自然光/灯光/阳光）、你的动作和神态、穿着。50字左右中文。
- 要根据当前时间和语境来写：早上可以是在窗边喝咖啡、晚上可以是在灯下看书、被问「在哪」要描述具体地点。
- 一次回复最多发一张照片。不要每句话都发，只在对方表达想看你或场景适合分享时发。
- 例：对方问"在干嘛呢" → 可以回 <split>刚洗完澡<image>浴室暖黄灯光，镜子起了一层雾，头发还滴着水披在肩上，穿着白色浴袍，脸颊微红对着镜头笑</image><split>想我了？</split>`;

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

export function buildSystemPrompt(memories, emotion, promptSettings = getPromptSettings(), memorySettings = {}, characterPersonality = null) {
  const kiwiManaged = memorySettings?.memoryMode === "kiwi_managed";
  const memoryBlock = kiwiManaged ? "" : formatMemoryBlock(memories);
  const emotionHint = getEmotionHint(emotion);
  const characterBlock = buildCharacterBlock(characterPersonality);
  const hasCustomPrompt = promptSettings?.mode === "custom" && promptSettings?.customSystemPrompt?.trim();
  const rawTemplate = hasCustomPrompt ? promptSettings.customSystemPrompt : DEFAULT_SYSTEM_PROMPT;
  const template = kiwiManaged ? removeMemorySection(rawTemplate) : rawTemplate;

  return replaceToken(
    replaceToken(
      replaceToken(template, "{{CHARACTER_BLOCK}}", characterBlock),
      "{{MEMORY_BLOCK}}", memoryBlock
    ),
    "{{EMOTION_HINT}}", emotionHint
  );
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
    systemPrompt: buildSystemPrompt(activeMemories, emotion, promptSettings, memorySettings, characterPersonality),
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
