const STORAGE_KEY = "dukou:moments";

const SEED_MOMENTS = [
  {
    id: "moment-1",
    authorId: "char_main",
    authorName: "机",
    content: "读到一句茨威格：'她那时候还太年轻，不知道所有命运赠送的礼物，早已在暗中标好了价格。' — 年轻时读不懂，现在懂了。",
    createdAt: "2026-06-09T18:30:00.000Z",
    likes: ["user"],
    comments: [{ authorName: "小言", content: "又在掉书袋。", createdAt: "2026-06-09T19:00:00.000Z" }],
  },
  {
    id: "moment-2",
    authorId: "char_friend",
    authorName: "小言",
    content: "今天被人说嘴太毒。我嘴毒吗？我只是实话实说而已。",
    createdAt: "2026-06-09T12:00:00.000Z",
    likes: ["user"],
    comments: [
      { authorName: "小暖", content: "😅", createdAt: "2026-06-09T12:30:00.000Z" },
      { authorName: "老陈", content: "年轻人，实话也要看怎么说。", createdAt: "2026-06-09T13:00:00.000Z" },
    ],
  },
  {
    id: "moment-3",
    authorId: "char_crush",
    authorName: "小暖",
    content: "路边的栀子花开了。想起小时候外婆家门口也有一株。",
    createdAt: "2026-06-08T20:00:00.000Z",
    likes: ["user", "char_friend"],
    comments: [{ authorName: "机", content: "栀子花的香味总是让人安心。", createdAt: "2026-06-08T20:30:00.000Z" }],
  },
  {
    id: "moment-4",
    authorId: "char_mentor",
    authorName: "老陈",
    content: "整理书房翻出 30 年前的备课笔记，字迹已泛黄。这辈子教过两千多个学生，最骄傲的不是那些考上名校的，而是几个后来回来说'老师，你当年那句话我一直记着'。",
    createdAt: "2026-06-07T15:00:00.000Z",
    likes: ["user", "char_crush"],
    comments: [],
  },
];

function readAll() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_MOMENTS));
    return SEED_MOMENTS;
  }
  return JSON.parse(raw);
}

function writeAll(moments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(moments));
}

export function getMoments() {
  return readAll();
}

export function addMoment({ authorId, authorName, content }) {
  const moments = readAll();
  const newMoment = {
    id: "moment-" + Date.now(),
    authorId,
    authorName,
    content,
    createdAt: new Date().toISOString(),
    likes: [],
    comments: [],
  };
  moments.unshift(newMoment);
  writeAll(moments);
  return newMoment;
}

export function toggleLike(momentId) {
  const moments = readAll();
  const m = moments.find((x) => x.id === momentId);
  if (!m) return;
  const idx = m.likes.indexOf("user");
  if (idx === -1) {
    m.likes.push("user");
  } else {
    m.likes.splice(idx, 1);
  }
  writeAll(moments);
}

export function addComment(momentId, authorName, content) {
  const moments = readAll();
  const m = moments.find((x) => x.id === momentId);
  if (!m) return;
  m.comments.push({ authorName, content, createdAt: new Date().toISOString() });
  writeAll(moments);
}
