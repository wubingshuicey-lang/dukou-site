import { useState, useCallback } from "react";
import { getMoments, toggleLike, addComment, addMoment } from "../../store/momentsStore.js";

function formatMomentDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "昨天";
  if (diffDay < 7) return `${diffDay}天前`;
  return d.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export default function MomentsScreen() {
  const [moments, setMoments] = useState(getMoments());
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [commentOpenId, setCommentOpenId] = useState(null);
  const [commentText, setCommentText] = useState("");

  const refresh = useCallback(() => setMoments([...getMoments()]), []);

  function handlePublish() {
    const t = composerText.trim();
    if (!t) return;
    setPublishing(true);
    addMoment({ authorId: "user", authorName: "我", content: t });
    setComposerText("");
    setComposerOpen(false);
    setPublishing(false);
    refresh();
  }

  function handleLike(momentId) {
    toggleLike(momentId);
    refresh();
  }

  function handleOpenComment(momentId) {
    setCommentOpenId(commentOpenId === momentId ? null : momentId);
    setCommentText("");
  }

  function handleSubmitComment(momentId) {
    const t = commentText.trim();
    if (!t) return;
    addComment(momentId, "我", t);
    setCommentText("");
    setCommentOpenId(null);
    refresh();
  }

  return (
    <div className="moments-root">
      <div className="moments-feed">
        {/* Cover Header */}
        <div className="moments-cover">
          <div className="moments-cover-bg" />
          <div className="moments-cover-info">
            <span className="moments-cover-name">我</span>
            <div className="moments-cover-avatar">我</div>
          </div>
        </div>

        {/* Composer */}
        <div className="wx-composer">
          <div className="wx-composer-avatar">我</div>
          <button
            className="wx-composer-hint"
            type="button"
            onClick={() => setComposerOpen(true)}
          >
            分享我的朋友圈...
          </button>
        </div>

        {composerOpen && (
          <div className="wx-composer-expand" role="presentation" onClick={() => setComposerOpen(false)}>
            <div className="wx-composer-expand-panel" onClick={(e) => e.stopPropagation()}>
              <textarea
                className="wx-composer-textarea"
                placeholder="记录这一刻的想法..."
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                maxLength={1000}
                disabled={publishing}
                autoFocus
              />
              <div className="wx-composer-footer">
                <button
                  className="wx-composer-cancel"
                  type="button"
                  onClick={() => { setComposerOpen(false); setComposerText(""); }}
                >
                  取消
                </button>
                <button
                  className="wx-composer-send"
                  type="button"
                  onClick={handlePublish}
                  disabled={!composerText.trim() || publishing}
                >
                  发表
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feed */}
        {moments.length === 0 && (
          <div className="wx-empty">
            <span>还没有朋友圈</span>
          </div>
        )}

        {moments.map((m) => {
          const liked = m.likes.includes("user");
          const totalLikes = m.likes.length;
          const hasLikesOrComments = totalLikes > 0 || m.comments.length > 0;

          return (
            <div key={m.id} className="wx-moment">
              {/* Avatar + Name + Date */}
              <div className="wx-moment-top">
                <div className="wx-moment-avatar">{m.authorName[0]}</div>
                <div className="wx-moment-body">
                  <div className="wx-moment-head">
                    <span className="wx-moment-name">{m.authorName}</span>
                    {m.authorId.startsWith("char_") && (
                      <span className="wx-moment-role-tag">角色</span>
                    )}
                  </div>
                  <p className="wx-moment-content">{m.content}</p>
                  <div className="wx-moment-meta-row">
                    <span className="wx-moment-time">{formatMomentDate(m.createdAt)}</span>
                    <div className="wx-moment-ops">
                      <button
                        type="button"
                        className={`wx-moment-op-btn${liked ? " is-liked" : ""}`}
                        onClick={() => handleLike(m.id)}
                      >
                        {liked ? "♥" : "♡"}
                      </button>
                      <button
                        type="button"
                        className="wx-moment-op-btn"
                        onClick={() => handleOpenComment(m.id)}
                      >
                        ✎
                      </button>
                    </div>
                  </div>

                  {/* Likes + Comments zone */}
                  {hasLikesOrComments && (
                    <div className="wx-moment-zone">
                      {totalLikes > 0 && (
                        <div className="wx-zone-likes">
                          <span className="wx-zone-heart">♥</span>
                          <span>
                            {m.likes.includes("user") ? "我" : ""}
                            {m.likes.filter((id) => id !== "user").map((name, i) => (
                              <span key={name}>
                                {m.likes.includes("user") || i > 0 ? "、" : ""}
                                {name}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {m.comments.map((c, i) => (
                        <div key={i} className="wx-zone-comment">
                          <span className="wx-zone-comment-author">{c.authorName}</span>
                          ：{c.content}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment input */}
                  {commentOpenId === m.id && (
                    <div className="wx-comment-box">
                      <input
                        className="wx-comment-input"
                        placeholder="评论"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitComment(m.id)}
                        autoFocus
                      />
                      <button
                        className="wx-comment-send"
                        onClick={() => handleSubmitComment(m.id)}
                        disabled={!commentText.trim()}
                      >
                        发送
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="wx-moment-sep" />
            </div>
          );
        })}

        <div className="wx-feed-end">— 没有更多了 —</div>
      </div>
    </div>
  );
}
