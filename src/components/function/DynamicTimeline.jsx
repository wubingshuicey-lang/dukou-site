function ImagePlaceholder() {
  return (
    <div className="timeline-image-placeholder" role="img" aria-label="低饱和黑白图文动态占位图">
      <span>LOW SATURATION IMAGE</span>
    </div>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.2s-7-4.25-8.8-9.1C2 7.8 3.85 5 6.8 5c1.75 0 3.15.95 4.05 2.25C11.75 5.95 13.15 5 14.9 5c2.95 0 4.8 2.8 3.6 6.1-1.8 4.85-8.5 9.1-8.5 9.1z"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 6.5h14v9H9.4L5 18.5v-12z" />
      <path d="M8.5 10h7M8.5 12.5h4.8" />
    </svg>
  );
}

function getMomentLikedByDu(item) {
  if (typeof item?.likedByDu === 'boolean') return item.likedByDu;
  return Number(item?.likeCount || 0) > Number(Boolean(item?.likedByUser));
}

function getMomentLikeCount(item) {
  return Number(Boolean(item?.likedByUser)) + Number(getMomentLikedByDu(item));
}

function EnvelopeSketch() {
  return (
    <svg className="timeline-envelope-sketch" viewBox="0 0 260 150" aria-label="铅笔线稿信封" role="img">
      <path d="M24 30c67-7 142-7 213 0" />
      <path d="M24 30c-4 30-4 60 1 92 71 4 142 4 212-1 3-31 3-61 0-91" />
      <path d="M27 33c33 26 66 50 100 73 7 5 13 5 20 0 31-23 61-47 89-73" />
      <path d="M27 119c29-22 58-42 88-61" />
      <path d="M235 119c-28-22-57-43-88-62" />
      <path d="M62 48c44-4 90-4 135 0" />
      <path d="M70 132c40 4 80 4 120 0" />
    </svg>
  );
}

function TimelineMeta({ item }) {
  if (item.type !== "moment") {
    return null;
  }

  return (
    <div className="timeline-meta" aria-label="动态互动状态">
      <span className={item.likedByUser ? "is-liked" : undefined}>
        <HeartIcon filled={item.likedByUser} />
        {getMomentLikeCount(item)}
      </span>
      <span>
        <CommentIcon />
        {item.comments?.length || 0}
      </span>
    </div>
  );
}

function PostcardArtThumb({ imageUrl, postcardImage }) {
  const resolvedImage = imageUrl || postcardImage;

  return (
    <div className="timeline-postcard-art" aria-hidden="true">
      {resolvedImage ? (
        <img src={resolvedImage} alt="" />
      ) : (
        <>
          <span className="timeline-postcard-sky" />
          <span className="timeline-postcard-sea" />
          <span className="timeline-postcard-shore" />
          <span className="timeline-postcard-light" />
        </>
      )}
    </div>
  );
}

function formatReviewTicketDate(value) {
  if (!value) return "LOCAL";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "LOCAL";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase();
}

function getReviewTicketTypeLabel(item) {
  if (item.content?.includes("读完")) return "BOOK";
  if (item.content?.includes("看完")) return "FILM";
  return "BOOK/FILM";
}

function ReviewTicket({ item }) {
  const isDuReview = item.subtype === "reviewRatedByDu";
  const ticketDate = formatReviewTicketDate(item.createdAt);
  const recordLabel = isDuReview || item.source === "du" ? "DU RECORD" : "TONG RECORD";

  return (
    <div className={`timeline-review-ticket ${isDuReview ? "is-du-review" : "is-user-review"}`}>
      <span className="timeline-ticket-cut ticket-cut-tl" aria-hidden="true" />
      <span className="timeline-ticket-cut ticket-cut-tr" aria-hidden="true" />
      <span className="timeline-ticket-cut ticket-cut-bl" aria-hidden="true" />
      <span className="timeline-ticket-cut ticket-cut-br" aria-hidden="true" />
      <span className="timeline-ticket-cut ticket-cut-tear-top" aria-hidden="true" />
      <span className="timeline-ticket-cut ticket-cut-tear-bottom" aria-hidden="true" />
      <div className="timeline-review-ticket-main">
        <time className="timeline-review-ticket-date" dateTime={item.createdAt || undefined}>{ticketDate}</time>
        <p className="timeline-review-ticket-copy">{item.content}</p>
      </div>
      <div className="timeline-review-ticket-stub">
        <span className="timeline-review-stub-meta" aria-hidden="true">
          <span>REVIEW NOTE</span>
          <span>{getReviewTicketTypeLabel(item)} / {recordLabel}</span>
        </span>
        <span className="timeline-review-stub-admit">{isDuReview ? "DU NOTE" : "REVIEW"}</span>
      </div>
    </div>
  );
}

function TimelineBody({ item, postcardImage }) {
  if (item.type === "moment") {
    return (
      <>
        {item.mediaUrl && <ImagePlaceholder />}
        <p>{item.content}</p>
        <TimelineMeta item={item} />
      </>
    );
  }

  if (item.type === "letter") {
    return (
      <div className="timeline-letter timeline-letter-envelope">
        <h3>{item.title || "来信"}</h3>
        <div className="timeline-letter-stage">
          <EnvelopeSketch />
        </div>
        <TimelineMeta item={item} />
      </div>
    );
  }

  if (item.type === "postcard") {
    return (
      <div className="timeline-card-preview">
        <div>
          <small>{item.title || "明信片"}</small>
          <strong>{item.content}</strong>
          <TimelineMeta item={item} />
        </div>
        <PostcardArtThumb imageUrl={item.mediaUrl} postcardImage={postcardImage} />
      </div>
    );
  }

  if (item.type === "reminder") {
    return (
      <div className="timeline-reminder">
        <small>{item.title}</small>
        <p>{item.content}</p>
        <TimelineMeta item={item} />
      </div>
    );
  }

  if (item.type === "schedule") {
    return (
      <div className="timeline-companion">
        <span>{item.title || "日程"}</span>
        <p>{item.content}</p>
        <TimelineMeta item={item} />
      </div>
    );
  }

  if (item.type === "review") {
    return <ReviewTicket item={item} />;
  }

  if (item.type === "diary") {
    return (
      <div className="timeline-summary">
        <h3>{item.title || "小机日记"}</h3>
        <p>{item.content}</p>
        {item.meta?.length > 0 && (
          <div>
            {item.meta.map((meta) => (
              <span key={meta}>{meta}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <p>{item.content}</p>;
}

export default function DynamicTimeline({ items, onSelectItem, postcardImage }) {
  return (
    <section className="dynamic-timeline" aria-label="机发布的动态流">
      <header className="timeline-section-header">
        <span>DU'S STREAM</span>
        <strong>机留下的动态</strong>
      </header>
      <div className="timeline-list">
        {items.map((item) => (
          <article className={`timeline-item timeline-item-${item.type}`} key={item.id}>
            <div className="timeline-time-mark">
              <time>{item.time}</time>
              {item.isUnread && <span aria-label="未读动态" />}
            </div>
            <button type="button" className="timeline-content timeline-content-button" onClick={() => onSelectItem?.(item)}>
              <TimelineBody item={item} postcardImage={postcardImage} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
