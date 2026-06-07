export default function TokenPanel({ usage, error, open, onToggle }) {
  if (!usage && !error) return null;

  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  const cacheRead = usage?.cacheReadTokens ?? 0;

  return (
    <div className="token-panel">
      <button type="button" onClick={onToggle}>
        <span>
          {error ? `模型：${error.message}` : `本次 输入 ${input} · 输出 ${output} · 缓存命中 ${cacheRead}`}
        </span>
        <span>{open ? "收起" : "详情"}</span>
      </button>
      {open && (
        <div className="token-details">
          {error ? (
            <div>错误类型：{error.type}</div>
          ) : (
            <div>总量 {usage?.totalTokens ?? input + output} · 缓存写入 {usage?.cacheWriteTokens ?? 0}</div>
          )}
        </div>
      )}
    </div>
  );
}
