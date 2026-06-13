/**
 * contradiction.js — 矛盾检测模块
 *
 * 当用户说了一条新记忆，检测是否与旧记忆语义冲突。
 * 例如：3月说"我不吃辣"，6月说"川菜好吃" → 自动标记旧记忆为过期。
 */

// ============================================================
// cosineSimilarity — 余弦相似度
// ============================================================

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// ============================================================
// hasNegationFlip — 否定翻转检测
// ============================================================

const NEGATION_WORDS = [
  "不", "没", "别", "从不", "绝不", "再也", "永远不",
  "绝对不", "坚决不", "不可能", "不会", "不再",
];

function hasNegation(text) {
  if (!text) return false;
  return NEGATION_WORDS.some(word => text.includes(word));
}

/**
 * 检测两条文本是否有一条有否定词而另一条没有。
 * 这意味着对同一话题的态度发生了翻转。
 */
export function hasNegationFlip(newText, oldText) {
  if (!newText || !oldText) return false;
  const newHasNeg = hasNegation(newText);
  const oldHasNeg = hasNegation(oldText);
  // 一个有否定、另一个没有 → 态度翻转
  return newHasNeg !== oldHasNeg;
}

// ============================================================
// detectContradictionCandidate — 矛盾候选检测
// ============================================================

const SIMILARITY_THRESHOLD = 0.75;

function decodeEmbedding(raw) {
  if (!raw) return null;
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (Array.isArray(raw)) return raw;
    return null;
  } catch {
    return null;
  }
}

/**
 * 在一个记忆列表中查找与新记忆矛盾的旧记忆。
 *
 * @param {string} newText - 新记忆文本
 * @param {string|null} newEmbedding - 新记忆的向量（JSON 字符串）
 * @param {Array} oldMemories - 旧记忆列表，每条需含 id, text, embedding, archived
 * @returns {{ contradictedId: string, reason: string } | null}
 */
export function detectContradictionCandidate(newText, newEmbedding, oldMemories) {
  if (!newEmbedding || !newText) return null;
  if (!Array.isArray(oldMemories) || oldMemories.length === 0) return null;

  const newVec = decodeEmbedding(newEmbedding);
  if (!newVec) return null;

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const mem of oldMemories) {
    // 跳过已归档/已过期/已锁定（锁定的是用户主动留的）
    if (mem.archived || mem.superseded) continue;

    const oldVec = decodeEmbedding(mem.embedding);
    if (!oldVec) continue;

    const similarity = cosineSimilarity(newVec, oldVec);

    // 高相似度 + 否定翻转 → 可能是矛盾
    if (similarity > SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
      if (hasNegationFlip(newText, mem.text)) {
        bestMatch = mem;
        bestSimilarity = similarity;
      }
    }
  }

  if (bestMatch) {
    return {
      contradictedId: bestMatch.id,
      reason: "negation_flip",
      similarity: Math.round(bestSimilarity * 100) / 100,
    };
  }

  return null;
}
