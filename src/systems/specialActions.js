export function stripSpecialTags(text) {
  return String(text || "")
    .replace(/<end_session>/g, "")
    .replace(/<block_user>/g, "")
    .replace(/<unblock_user>/g, "")
    .replace(/<no_reply>/g, "")
    .trim();
}

export function parseSpecialActions(text) {
  const raw = String(text || "");
  return {
    text: stripSpecialTags(raw),
    endSession: raw.includes("<end_session>"),
    blockUser: raw.includes("<block_user>"),
    unblockUser: raw.includes("<unblock_user>"),
    noReply: raw.includes("<no_reply>"),
  };
}

export function splitToMessages(text, outputMode = "sentence") {
  const clean = stripSpecialTags(text);
  if (!clean) return [];
  if (outputMode === "paragraph") return [clean];

  const splitParts = clean
    .split(/<split>/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (splitParts.length > 1) return splitParts;

  const byPunctuation = clean
    .split(/(?<=[。！？…\n])/)
    .map((part) => part.trim())
    .filter(Boolean);

  return byPunctuation.length ? byPunctuation : [clean];
}

export function fallbackReplyFor(text) {
  if (/设置|key|模型/i.test(text)) {
    return "先把设置页填顺。<split>没有 key 也没关系。<split>我先陪你把界面跑起来。";
  }
  if (/累|难|崩|焦虑|害怕/.test(text)) {
    return "我在。<split>先别急着解释自己。<split>这会儿能坐下来就够了。";
  }
  return "我在。<split>你刚才那句我听见了。";
}
