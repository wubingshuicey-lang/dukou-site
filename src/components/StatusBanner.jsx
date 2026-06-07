export default function StatusBanner({ status, error }) {
  if (!status && !error) return null;
  if ((status === "active" || status === "idle" || status === "waiting_model" || status === "typing" || status === "blocked") && !error) {
    return null;
  }

  const text =
    error?.message ||
    {
      waiting_model: "机在想。",
      typing: "机正在输入。",
      failed: "这次没有发出去，我的话还在。",
      away: "机暂时离开了。",
      ended: "机已经离开这次对话。",
      blocked: "机把这次聊天挡住了，可以写小纸条。",
      offline: "我这边断了一下。",
    }[status] ||
    status;

  return <div className={error ? "status-banner is-error" : "status-banner"}>{text}</div>;
}
