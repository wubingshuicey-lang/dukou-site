export default function TimeHero({
  time = "21:45",
  dateNumber = "05",
  screenTime = "3h 20m",
  notice,
}) {
  const segments = notice?.segments || [
    { text: "我，" },
    { text: "降温了", highlight: true },
    { text: "，记得添衣。今晚外卖已备注" },
    { text: "无香菜", highlight: true },
    { text: "。" },
  ];

  return (
    <section className="time-hero" aria-label="今日时间概览">
      <p className="time-hero-note">
        {segments.map((segment, index) =>
          segment.highlight ? <span key={`${segment.text}-${index}`}>{segment.text}</span> : segment.text,
        )}
      </p>
      <div className="time-hero-clock">
        <div className="time-hero-date" aria-hidden="true">
          {dateNumber}
        </div>
        <div className="time-hero-current">
          <strong>{time}</strong>
          <small>{screenTime}</small>
        </div>
      </div>
    </section>
  );
}
