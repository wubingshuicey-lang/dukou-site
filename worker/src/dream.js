/**
 * dream.js — 对话自动总结 (Dream/Sleep 机制)
 *
 * Cloudflare Worker Cron 每天触发一次：
 * 1. 取出昨天的所有对话
 * 2. 调用 LLM 压缩成 3-5 条关键记忆
 * 3. 写入 character_memories（type=dream_summary, 近乎不衰减）
 */

// ============================================================
// scheduled — Cloudflare Workers Cron handler
// ============================================================

export async function scheduled(event, env, ctx) {
  const db = env.DB;

  // 获取所有有消息的 chatSpace
  const chats = await db.prepare(
    `SELECT DISTINCT chat_space_id, user_id FROM messages
     WHERE created_at >= datetime('now', '-1 day')
       AND created_at < datetime('now')
       AND role IN ('user', 'assistant')
       AND deleted_at IS NULL`
  ).all();

  let totalSummaries = 0;

  for (const chat of chats.results) {
    try {
      // 取昨天的消息（最多 300 条）
      const messages = await db.prepare(
        `SELECT role, content FROM messages
         WHERE user_id = ? AND chat_space_id = ?
           AND created_at >= datetime('now', '-1 day')
           AND created_at < datetime('now')
           AND role IN ('user', 'assistant')
           AND deleted_at IS NULL
         ORDER BY created_at ASC LIMIT 300`
      ).bind(chat.user_id, chat.chat_space_id).all();

      if (messages.results.length < 5) continue; // 太少不值得总结

      // 构建对话文本
      const transcript = messages.results
        .map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
        .join('\n');

      // 调 LLM 总结
      const summary = await summarizeWithLLM(transcript, env);
      if (!summary) continue;

      // 写入记忆（type=dream_summary, 高重要性, 极慢衰减）
      const id = `dream-${new Date().toISOString().slice(0, 10)}-${chat.chat_space_id}`;
      await db.prepare(
        `INSERT OR REPLACE INTO character_memories
         (id, user_id, chat_space_id, text, embedding, semantic_type, importance, heat, decay_factor, pinned, archived)
         VALUES (?, ?, ?, ?, NULL, 'dream_summary', 0.85, 1.0, 0.005, 0, 0)`
      ).bind(id, chat.user_id, chat.chat_space_id, summary).run();

      totalSummaries++;
    } catch (err) {
      console.error(`Dream 总结失败 (chat ${chat.chat_space_id}):`, err);
    }
  }

  console.log(`Dream 完成：${chats.results.length} 个会话，${totalSummaries} 条总结`);
}

// ============================================================
// summarizeWithLLM — 调 LLM 压缩对话
// ============================================================

async function summarizeWithLLM(transcript, env) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    // 降级：纯文本提取
    return simpleExtract(transcript);
  }

  try {
    const baseUrl = (env.EMBEDDING_BASE_URL || "https://api.openai.com/v1")
      .replace(/\/+$/, "")
      .replace(/\/embeddings$/, ""); // 去掉 /embeddings 后缀，用 chat/completions

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content:
            "你是记忆压缩引擎。把对话压缩成 3-5 条中文关键记忆，每条 30 字以内。" +
            "只提取：用户的重要决定、偏好变化、未来计划、情绪波动、关系进展。" +
            "不要编造。用列表格式输出，每行一条，以 '- ' 开头。",
        }, {
          role: "user",
          content: `总结以下对话的关键记忆：\n\n${transcript.slice(0, 4000)}`,
        }],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`LLM 总结请求失败: ${response.status}`);
      return simpleExtract(transcript);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return content.trim() || simpleExtract(transcript);
  } catch (err) {
    console.error("LLM 总结异常:", err);
    return simpleExtract(transcript);
  }
}

// ============================================================
// simpleExtract — 纯文本降级提取
// ============================================================

function simpleExtract(transcript) {
  const userLines = transcript
    .split('\n')
    .filter(l => l.startsWith('用户：') && l.length > 15)
    .map(l => l.replace('用户：', '').trim());

  if (userLines.length === 0) return '';

  // 取最长的 5 条用户消息作为摘要
  const top = [...userLines]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .map((line, i) => `- ${line.slice(0, 50)}`);

  return `昨日关键消息：\n${top.join('\n')}`;
}
