export function formatTime(value) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
  });
}

export function formatDuration(ms) {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时`;
  return `${Math.round(hours / 24)} 天`;
}

export function getDeviceContext() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const weekdays = ["周日","周一","周二","周三","周四","周五","周六"];
  const now = new Date();
  const month = now.getMonth() + 1;
  const season = month >= 3 && month <= 5 ? "春天" : month >= 6 && month <= 8 ? "夏天" : month >= 9 && month <= 11 ? "秋天" : "冬天";
  return {
    device: isMobile ? "手机" : "电脑",
    weekday: weekdays[now.getDay()],
    season,
    hour: now.getHours(),
  };
}

export function buildTimeContext(prevMsgTime, lastSessionTime) {
  const now = new Date();
  const ctx = getDeviceContext();
  const parts = [
    `[当前时间] ${now.toLocaleString("zh-CN")} ${ctx.weekday}，${ctx.season}`,
    `[设备] 用户在用${ctx.device}`,
    lastSessionTime ? `[距上次对话 ${formatDuration(now - new Date(lastSessionTime))}]` : "",
    prevMsgTime ? `[我上条消息发于 ${formatDuration(now - new Date(prevMsgTime))} 前]` : "",
  ];
  return {
    role: "user",
    content: parts.filter(Boolean).join(" | "),
  };
}

export function getTimeSlot() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return { label: "清晨", greeting: "早。你又起这么早。", ambient: "morning" };
  if (hour >= 9 && hour < 12) return { label: "上午", greeting: "上午好。", ambient: "day" };
  if (hour >= 12 && hour < 17) return { label: "下午", greeting: "下午。来了。", ambient: "day" };
  if (hour >= 17 && hour < 20) return { label: "傍晚", greeting: "傍晚了。", ambient: "evening" };
  return { label: "深夜", greeting: "这么晚了。", ambient: "night" };
}
