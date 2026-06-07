import { useEffect, useMemo, useState } from "react";
import DynamicTimeline from "./DynamicTimeline.jsx";

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 5.5h13v13h-13z" />
      <path d="M8 3.5v4M16 3.5v4M5.5 9.5h13" />
      <path d="M8.5 13h2M13.5 13h2M8.5 16h2" />
    </svg>
  );
}

function getDateMeta(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return {
    key: `${match[1]}-${match[2]}-${match[3]}`,
    year,
    month,
    day,
    monthKey: `${match[1]}-${match[2]}`,
  };
}

function compareCreatedAtAsc(left, right) {
  const leftTime = Date.parse(left.createdAt || "");
  const rightTime = Date.parse(right.createdAt || "");

  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
    return String(left.time || "").localeCompare(String(right.time || ""));
  }

  if (Number.isNaN(leftTime)) return 1;
  if (Number.isNaN(rightTime)) return -1;
  return leftTime - rightTime;
}

function buildHistoryIndex(items) {
  const byDate = new Map();
  const metaByDate = new Map();

  items.forEach((item) => {
    const meta = getDateMeta(item.createdAt);

    if (!meta) {
      return;
    }

    const currentItems = byDate.get(meta.key) || [];
    byDate.set(meta.key, [...currentItems, item]);
    metaByDate.set(meta.key, meta);
  });

  const dateMetas = Array.from(metaByDate.values()).sort((left, right) => {
    if (right.year !== left.year) return right.year - left.year;
    if (right.month !== left.month) return right.month - left.month;
    return right.day - left.day;
  });
  const monthMap = new Map();

  dateMetas.forEach((meta) => {
    const month = monthMap.get(meta.monthKey) || {
      key: meta.monthKey,
      year: meta.year,
      month: meta.month,
      count: 0,
    };
    month.count += byDate.get(meta.key)?.length || 0;
    monthMap.set(meta.monthKey, month);
  });

  return {
    byDate,
    dateMetas,
    latestDateKey: dateMetas[0]?.key || "",
    metaByDate,
    months: Array.from(monthMap.values()).sort((left, right) => {
      if (right.year !== left.year) return right.year - left.year;
      return right.month - left.month;
    }),
  };
}

function formatDate(meta) {
  if (!meta) return "没有动态";
  return `${meta.year}年${meta.month}月${meta.day}日`;
}

function formatMonth(meta) {
  if (!meta) return "";
  return `${meta.year}年${meta.month}月`;
}

function parseMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey || "");

  if (!match) {
    return null;
  }

  return {
    key: monthKey,
    year: Number(match[1]),
    month: Number(match[2]),
  };
}

function formatDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCalendarCells(monthMeta, history) {
  if (!monthMeta) return [];

  const firstWeekday = new Date(monthMeta.year, monthMeta.month - 1, 1).getDay();
  const leadingEmptyCount = (firstWeekday + 6) % 7;
  const daysInMonth = new Date(monthMeta.year, monthMeta.month, 0).getDate();
  const cells = Array.from({ length: leadingEmptyCount }, (_, index) => ({
    key: `empty-start-${index}`,
    isEmpty: true,
  }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(monthMeta.year, monthMeta.month, day);
    cells.push({
      key: dateKey,
      dateKey,
      day,
      count: history.byDate.get(dateKey)?.length || 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      isEmpty: true,
    });
  }

  return cells;
}

function CalendarMonth({ calendarCells, monthMeta, selectedDateKey, onSelectDate }) {
  return (
    <div className="dynamic-history-calendar" aria-label={`${formatMonth(monthMeta)}动态日历`}>
      {weekdayLabels.map((label) => (
        <span className="dynamic-history-calendar-weekday" key={label}>
          {label}
        </span>
      ))}

      {calendarCells.map((cell) => (
        <div className="dynamic-history-calendar-cell" key={cell.key}>
          {!cell.isEmpty && (
            <button
              type="button"
              className={selectedDateKey === cell.dateKey ? "is-active" : ""}
              onClick={() => onSelectDate(cell.dateKey)}
              disabled={!cell.count}
              aria-label={cell.count ? `${cell.day}日，${cell.count}条动态` : `${cell.day}日，没有动态`}
            >
              <span>{cell.day}</span>
              {cell.count > 0 && <small aria-hidden="true" />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DynamicHistoryPanel({
  items,
  initialSelectedDateKey = "",
  onBack,
  onSelectItem,
  onStateChange,
  postcardImage,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const history = useMemo(() => buildHistoryIndex(items || []), [items]);
  const [selectedDateKey, setSelectedDateKey] = useState(initialSelectedDateKey || history.latestDateKey);
  const [visibleMonthKey, setVisibleMonthKey] = useState("");
  const selectedMeta = history.metaByDate.get(selectedDateKey) || history.dateMetas[0] || null;
  const selectedDayItems = [...(history.byDate.get(selectedMeta?.key) || [])].sort(compareCreatedAtAsc);
  const selectedMonthKey = selectedMeta?.monthKey || "";
  const monthKeysAsc = history.months
    .map((month) => month.key)
    .sort((left, right) => left.localeCompare(right));
  const activeVisibleMonthKey = visibleMonthKey || selectedMonthKey || history.months[0]?.key || "";
  const visibleMonthMeta = history.months.find((month) => month.key === activeVisibleMonthKey) || parseMonthKey(activeVisibleMonthKey);
  const visibleMonthIndex = monthKeysAsc.indexOf(activeVisibleMonthKey);
  const previousMonthKey = visibleMonthIndex > 0 ? monthKeysAsc[visibleMonthIndex - 1] : "";
  const nextMonthKey =
    visibleMonthIndex >= 0 && visibleMonthIndex < monthKeysAsc.length - 1 ? monthKeysAsc[visibleMonthIndex + 1] : "";
  const calendarCells = buildCalendarCells(visibleMonthMeta, history);

  useEffect(() => {
    if (!history.latestDateKey) {
      setSelectedDateKey("");
      setVisibleMonthKey("");
      return;
    }

    if (!history.byDate.has(selectedDateKey)) {
      setSelectedDateKey(history.latestDateKey);
      onStateChange?.({ selectedDateKey: history.latestDateKey });
      setVisibleMonthKey(history.dateMetas[0]?.monthKey || "");
    }
  }, [history, selectedDateKey]);

  function handleTogglePicker() {
    if (!showPicker) {
      setVisibleMonthKey(selectedMonthKey);
    }

    setShowPicker((value) => !value);
  }

  function handleSelectDate(dateKey) {
    setSelectedDateKey(dateKey);
    onStateChange?.({ selectedDateKey: dateKey });
    setShowPicker(false);
  }

  return (
    <div className="function-detail-page dynamic-history-page">
      <header className="dynamic-history-header">
        <button type="button" className="dynamic-history-back" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>

        <div className="dynamic-history-title">
          <strong>{formatDate(selectedMeta)}</strong>
          <span>这一天 {selectedDayItems.length} 条动态</span>
        </div>

        <button
          type="button"
          className="dynamic-history-calendar-button"
          onClick={handleTogglePicker}
          aria-expanded={showPicker}
          aria-label="选择历史动态日期"
        >
          <CalendarIcon />
        </button>
      </header>

      <div className="dynamic-history-body">
        {history.dateMetas.length > 0 ? (
          <div className="dynamic-history-list">
            <DynamicTimeline items={selectedDayItems} onSelectItem={onSelectItem} postcardImage={postcardImage} />
          </div>
        ) : (
          <div className="dynamic-history-empty">
            <strong>还没有历史动态</strong>
            <p>有时间标记的动态会先收在这里。</p>
          </div>
        )}
      </div>

      {showPicker && (
        <div className="dynamic-history-picker-layer" role="presentation" onClick={() => setShowPicker(false)}>
          <section
            className="dynamic-history-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="选择历史动态日期"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dynamic-history-picker-head">
              <div>
                <strong>选择日期</strong>
                <span>{formatDate(selectedMeta)}</span>
              </div>
              <button type="button" onClick={() => setShowPicker(false)} aria-label="关闭日期选择">
                ×
              </button>
            </header>

            {history.dateMetas.length > 0 ? (
              <div className="dynamic-history-picker" aria-label="历史日期选择">
                <div className="dynamic-history-calendar-nav">
                  <button
                    type="button"
                    onClick={() => setVisibleMonthKey(previousMonthKey)}
                    disabled={!previousMonthKey}
                    aria-label="上一个有动态的月份"
                  >
                    ‹
                  </button>
                  <strong>{formatMonth(visibleMonthMeta)}</strong>
                  <button
                    type="button"
                    onClick={() => setVisibleMonthKey(nextMonthKey)}
                    disabled={!nextMonthKey}
                    aria-label="下一个有动态的月份"
                  >
                    ›
                  </button>
                </div>
                <CalendarMonth
                  calendarCells={calendarCells}
                  monthMeta={visibleMonthMeta}
                  selectedDateKey={selectedDateKey}
                  onSelectDate={handleSelectDate}
                />
                <p className="dynamic-history-calendar-note">有小点的日期表示这一天留下过动态。</p>
              </div>
            ) : (
              <div className="dynamic-history-empty dynamic-history-picker-empty">
                <strong>还没有可选日期</strong>
                <p>有时间标记的动态会出现在这里。</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
