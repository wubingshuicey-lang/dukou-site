/**
 * Lightweight semantic memory search for character memories.
 * Uses character bigram overlap scoring — no external model needed.
 * Runs entirely client-side.
 */

function tokenize(text) {
  // Split Chinese text into characters and filter noise
  const clean = String(text || "").replace(/[，。！？、；：""''（）\s\n]/g, "");
  if (!clean) return [];

  // Extract character bigrams (captures word fragments)
  const grams = [];
  for (let i = 0; i < clean.length; i++) {
    grams.push(clean[i]);
    if (i + 1 < clean.length) {
      grams.push(clean[i] + clean[i + 1]);
    }
  }
  return grams;
}

function computeTf(tokens) {
  const tf = {};
  for (const t of tokens) {
    tf[t] = (tf[t] || 0) + 1;
  }
  return tf;
}

function cosineSimilarity(queryTokens, docTokens) {
  const queryTf = computeTf(queryTokens);
  const docTf = computeTf(docTokens);

  const allTerms = new Set([...Object.keys(queryTf), ...Object.keys(docTf)]);
  let dot = 0;
  let magQ = 0;
  let magD = 0;
  for (const term of allTerms) {
    const q = queryTf[term] || 0;
    const d = docTf[term] || 0;
    dot += q * d;
    magQ += q * q;
    magD += d * d;
  }
  if (magQ === 0 || magD === 0) return 0;
  return dot / (Math.sqrt(magQ) * Math.sqrt(magD));
}

/**
 * Score and rank memories against the current user message.
 * Returns the top `limit` most relevant memories.
 */
export function searchMemories(memories, queryText, limit = 8) {
  if (!memories?.length || !queryText) return memories?.slice(-limit) || [];

  const queryTokens = tokenize(queryText);
  if (!queryTokens.length) return memories.slice(-limit);

  const scored = memories.map((m, idx) => {
    const docTokens = tokenize(m.text);
    const score = cosineSimilarity(queryTokens, docTokens);
    // Boost recent memories slightly
    const recencyBoost = 1 + 0.1 * (idx / Math.max(memories.length, 1));
    return { ...m, score: score * recencyBoost };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ score, ...m }) => m);
}
