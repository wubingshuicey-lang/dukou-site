import { useEffect, useRef, useState } from "react";
import TimeHero from "../components/function/TimeHero.jsx";
import FeatureGrid from "../components/function/FeatureGrid.jsx";
import FunctionChips from "../components/function/FunctionChips.jsx";
import DynamicHistoryPanel from "../components/function/DynamicHistoryPanel.jsx";
import DynamicTimeline from "../components/function/DynamicTimeline.jsx";
import {
  addDaysToDateString,
  calculateCycleProfile,
  getDaysBetweenDateStrings,
  getTodayDateString,
  loadCycleProfile,
  loadDynamics,
  loadFunctionPageState,
  loadMailbox,
  loadReminders,
  loadReviews,
  loadSchedule,
  saveCycleProfile,
  saveDynamics,
  saveFunctionPageState,
  saveMailbox,
  saveReminders,
  saveReviews,
  saveSchedule,
} from "../store/functionLocalStore.js";
import { DEFAULT_UI_SETTINGS, getSettings } from "../store/settings.js";
import postcardSceneImage from "../assets/postcard-scene.png";
import postcardPostmarkImage from "../assets/postcard-postmark-dukou.png";
import postcardTemplateFable from "../assets/postcard-template-fable.png";
import postcardTemplateOracle from "../assets/postcard-template-oracle.png";
import postcardTemplatePet from "../assets/postcard-template-pet.png";
import postcardTemplatePicnic from "../assets/postcard-template-picnic.png";
import "../styles/function.css";

const postcardTemplates = [
  { id: "fable", label: "旧票纸", imageUrl: postcardTemplateFable },
  { id: "pet", label: "小动物", imageUrl: postcardTemplatePet },
  { id: "oracle", label: "黑白月相", imageUrl: postcardTemplateOracle },
  { id: "picnic", label: "夏日草地", imageUrl: postcardTemplatePicnic },
];

const postcardTextLayoutOptions = [
  { id: "huiming", label: "汇明蓝字" },
  { id: "south-bay", label: "横线手写" },
  { id: "hotel-note", label: "便签留白" },
  { id: "split-back", label: "邮政背面" },
  { id: "vertical-art", label: "竖排诗卡" },
];

function getPostcardTextLayout(value) {
  return postcardTextLayoutOptions.some((layout) => layout.id === value) ? value : "huiming";
}

function getRandomPostcardTextLayout(mail) {
  const seed = [mail?.id, mail?.title, mail?.createdAt].filter(Boolean).join("");
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return postcardTextLayoutOptions[hash % postcardTextLayoutOptions.length].id;
}

function getPostcardLayoutForMail(mail) {
  return mail?.from === "du" ? getRandomPostcardTextLayout(mail) : getPostcardTextLayout(mail?.textLayout);
}
function getPostcardImageOrientation(value) {
  return value === "landscape" ? "landscape" : "portrait";
}

const mockTimelineItems = [
  {
    id: "moment-1",
    time: "07:00",
    type: "moment",
    content: "早晨下过雨。机记下窗户边的空气，还有你说今天想慢一点。",
    detailText:
      "早晨下过雨，窗边的空气慢了一拍。Du kept this moment because the room felt quiet, like a page waiting to be touched. 你说今天想慢一点，所以 the harbor answered in a softer rhythm.",
    archiveId: "2026-05-07-001",
    mediaUrl: null,
    isUnread: true,
    showInTimeline: true,
    source: "du",
    trigger: "wakeup",
    likeCount: 1,
    likedByUser: false,
    likedByDu: true,
    comments: [
      {
        id: "comment-1",
        author: "user",
        content: "这句我喜欢。",
        createdAt: "2026-05-07T07:12:00+08:00",
      },
    ],
    createdAt: "2026-05-07T07:00:00+08:00",
  },
  {
    id: "letter-1",
    time: "09:15",
    type: "letter",
    title: "新来信",
    content: "机写了一小段给我的信：今天先不要把所有空白都填满。",
    mailId: "mail-1",
    mediaUrl: null,
    isUnread: true,
    showInTimeline: true,
    source: "du",
    trigger: "manual",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: "2026-05-07T09:15:00+08:00",
  },
  {
    id: "postcard-1",
    time: "10:40",
    type: "postcard",
    title: "海边明信片",
    content: "午前的海面很浅，机把那一层灰蓝色寄了过来。",
    mediaUrl: null,
    isUnread: false,
    showInTimeline: true,
    source: "du",
    trigger: "memory",
    likeCount: 1,
    likedByUser: true,
    comments: [],
    createdAt: "2026-05-07T10:40:00+08:00",
  },
  {
    id: "review-1",
    time: "11:25",
    type: "review",
    subtype: "reviewRatedByUser",
    relatedReviewId: "review-book-1",
    title: "书影札记",
    content: "我读完了《百年孤独》，给了 ★★★★★。",
    mediaUrl: null,
    isUnread: true,
    showInTimeline: true,
    source: "user",
    trigger: "review",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: "2026-05-07T11:25:00+08:00",
  },
  {
    id: "moment-2",
    time: "13:45",
    type: "moment",
    content: "午后的桌面像一张被反复翻过的纸。机把这一条留在动态里。",
    detailText:
      "午后的桌面像一张被反复翻过的纸。Afternoon light moved across the desk with a careful hush, and Du kept it as proof that quiet things still happen with precision. 这一刻先放在这里，等晚上再回来看。",
    archiveId: "2026-05-07-002",
    mediaUrl: "/placeholder.jpg",
    isUnread: true,
    showInTimeline: true,
    source: "du",
    trigger: "chat",
    likeCount: 2,
    likedByUser: true,
    likedByDu: true,
    comments: [
      {
        id: "comment-2",
        author: "du",
        content: "我也觉得今天的光很轻。",
        createdAt: "2026-05-07T13:50:00+08:00",
      },
      {
        id: "comment-3",
        author: "user",
        content: "先存着。",
        createdAt: "2026-05-07T13:55:00+08:00",
      },
    ],
    createdAt: "2026-05-07T13:45:00+08:00",
  },
  {
    id: "reminder-1",
    time: "15:20",
    type: "reminder",
    title: "提醒",
    content: "15:30 前把水杯放到手边。机把它标成今日提醒。",
    reminderId: "du-reminder-water",
    mediaUrl: null,
    isUnread: false,
    showInTimeline: true,
    source: "du",
    trigger: "schedule",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: "2026-05-07T15:20:00+08:00",
  },
  {
    id: "schedule-1",
    time: "18:05",
    type: "schedule",
    title: "日程",
    content: "今晚还有 2 件小事，第一件已经被拆到最小步骤。",
    scheduleId: "schedule-a",
    mediaUrl: null,
    isUnread: false,
    showInTimeline: true,
    source: "system",
    trigger: "schedule",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: "2026-05-07T18:05:00+08:00",
  },
  {
    time: "23:00",
    id: "diary-1",
    type: "diary",
    title: "小机日记",
    content: "机整理了一页安静的日记，收在今天的日记归档里。",
    mediaUrl: null,
    isUnread: false,
    showInTimeline: true,
    source: "du",
    trigger: "manual",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: "2026-05-07T23:00:00+08:00",
  },
];

const defaultDynamics = mockTimelineItems.filter((item) => item.type !== "diary");
const diaryTimelineItem = mockTimelineItems.find((item) => item.type === "diary");
const defaultMomentDetailsById = defaultDynamics.reduce((details, item) => {
  if (item.type === "moment" && item.detailText) {
    details[item.id] = item.detailText;
  }

  return details;
}, {});

function syncDefaultMomentDetails(items) {
  return items.map((item) => {
    const detailText = defaultMomentDetailsById[item.id];

    return item.type === "moment" && detailText ? { ...item, detailText } : item;
  });
}

const mockDiaryEntries = [
  {
    id: "diary-2024-10-14",
    issue: "第 IV 卷 — 第 10 期",
    day: "14",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-14",
    dateLabel: "10月14日",
    writtenAt: "2024-10-14T07:42:18+08:00",
    title: "日常的安静结构",
    deck: "把边界重新放回房间里之后，今天没有那么容易被外界穿透。",
    thumbVariant: "notebook",
    imageVariant: "window",
    imageCaption: "晨光，工作室",
    weather: "阴天",
    mood: "安静",
    location: "房间",
    body: [
      "阴天的早晨有一种很深的安静。窗外的世界像被灰色的光轻轻按住，所有声音都慢了一点，也没有催促我立刻变得清醒。",
      "我坐在窗边，看云层一点点移动。那些很小的变化让心终于松开了昨天，没有继续抓着那些没做完的事不放。",
      "我们常常把一天搭成一座过分坚硬的房子，先考虑结构，再考虑呼吸。今天结构还在，但它终于留出了一点空隙。",
    ],
  },
  {
    id: "diary-2024-10-12",
    issue: "第 IV 卷 — 第 09 期",
    day: "12",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-12",
    dateLabel: "10月12日",
    writtenAt: "2024-10-12T22:16:43+08:00",
    title: "纹理与留白",
    deck: "安静很少是空的。它有表面、温度，也有自己的方向。",
    imageVariant: "texture",
    imageCaption: "窗帘习作",
    weather: "晴",
    mood: "专注",
    location: "书桌",
    body: [
      "下午被布料的纹理和光线的斜角轻轻固定住。没有发生什么很重要的事，所以每一个细节反而更容易被听见。",
      "安静的房间并不总是空的。有时候它只是在拒绝打断自己。",
    ],
  },
  {
    id: "diary-2024-10-09-text",
    issue: "第 IV 卷 — 第 08 期",
    day: "09",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-09",
    dateLabel: "10月9日",
    writtenAt: "2024-10-09T09:31:06+08:00",
    title: "把阻力当作指标",
    deck: "开始一件事的困难，常常比事情本身更大。",
    textOnly: true,
    weather: "阴",
    mood: "卡住后松开",
    location: "书桌",
    body: [
      "开始一件事的困难，常常比事情本身更大。今天我注意到，真正的阻力在执行之前，而不是执行之中。",
      "一旦动手，事情会变得具体，也会变得没有那么吓人。最消耗人的，是坐在原地把它想成一整片雾。",
      "所以今天把阻力当作指标：哪里最不想开始，哪里大概就藏着真正需要被拆小的部分。",
    ],
  },
  {
    id: "diary-2024-10-05",
    issue: "第 IV 卷 — 第 07 期",
    day: "05",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-05",
    dateLabel: "10月5日",
    writtenAt: "2024-10-05T18:09:27+08:00",
    title: "雨的地理",
    deck: "坐在咖啡馆里，看城市在湿玻璃后面慢慢散开。",
    imageVariant: "rain",
    imageCaption: "窗边座位",
    weather: "雨",
    mood: "柔软",
    location: "咖啡馆",
    body: [
      "雨把城市重新分成了几层。玻璃把街道推远，桌上的杯子反而成了唯一轮廓清楚的东西。",
      "让外面的世界暂时模糊，是一件让人安心的事。不是每一种景象都需要立刻被看清。",
    ],
  },
  {
    id: "diary-2024-10-03-text",
    issue: "第 IV 卷 — 第 06 期",
    day: "03",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-03",
    dateLabel: "10月3日",
    writtenAt: "2024-10-03T08:06:12+08:00",
    title: "短句",
    deck: "排版测试。",
    textOnly: true,
    weather: "晴",
    mood: "轻",
    location: "厨房",
    body: ["排版测试。"],
  },
  {
    id: "diary-2024-10-01-image-window",
    issue: "第 IV 卷 — 第 05 期",
    day: "01",
    month: "10月",
    year: "2024",
    dateIso: "2024-10-01",
    dateLabel: "10月1日",
    writtenAt: "2024-10-01T16:20:44+08:00",
    title: "窗边的下午",
    deck: "一张较横的图，用来测试图片日记在单列里的高度。",
    imageVariant: "window",
    imageCaption: "窗边",
    weather: "多云",
    mood: "松弛",
    location: "房间",
    body: ["排版测试。"],
  },
  {
    id: "diary-2024-09-28-text-long-title",
    issue: "第 IV 卷 — 第 04 期",
    day: "28",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-28",
    dateLabel: "9月28日",
    writtenAt: "2024-09-28T23:48:09+08:00",
    title: "一个很长的标题会怎样换行",
    deck: "测试长标题。",
    textOnly: true,
    weather: "阴",
    mood: "迟缓",
    location: "床边",
    body: ["这是用于测试长标题和多行摘要的文字，不承载正式内容，只观察卡片高度、截断和两列流式排布。"],
  },
  {
    id: "diary-2024-09-25-image-notebook",
    issue: "第 IV 卷 — 第 03 期",
    day: "25",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-25",
    dateLabel: "9月25日",
    writtenAt: "2024-09-25T11:03:37+08:00",
    title: "摊开的页",
    deck: "Notebook 图形比例测试。",
    imageVariant: "notebook",
    imageCaption: "纸页",
    weather: "晴",
    mood: "清醒",
    location: "书桌",
    body: ["排版测试。"],
  },
  {
    id: "diary-2024-09-22-text-empty",
    issue: "第 IV 卷 — 第 02 期",
    day: "22",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-22",
    dateLabel: "9月22日",
    writtenAt: "2024-09-22T06:55:01+08:00",
    title: "留空",
    deck: "",
    textOnly: true,
    weather: "雾",
    mood: "空",
    location: "阳台",
    body: [""],
  },
  {
    id: "diary-2024-09-19-image-texture",
    issue: "第 IV 卷 — 第 01 期",
    day: "19",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-19",
    dateLabel: "9月19日",
    writtenAt: "2024-09-19T20:31:18+08:00",
    title: "很窄的光",
    deck: "Texture 竖图比例测试，标题比较短。",
    imageVariant: "texture",
    imageCaption: "纹理",
    weather: "晴",
    mood: "专注",
    location: "工作室",
    body: ["排版测试。"],
  },
  {
    id: "diary-2024-09-16-text-medium",
    issue: "第 III 卷 — 第 12 期",
    day: "16",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-16",
    dateLabel: "9月16日",
    writtenAt: "2024-09-16T13:12:52+08:00",
    title: "中等长度",
    deck: "测试中等文本。",
    textOnly: true,
    weather: "雨",
    mood: "稳定",
    location: "咖啡馆",
    body: ["中等长度的文字日记排版测试，主要看标签、日期和正文在单列卡片里是否拥挤。"],
  },
  {
    id: "diary-2024-09-13-image-rain",
    issue: "第 III 卷 — 第 11 期",
    day: "13",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-13",
    dateLabel: "9月13日",
    writtenAt: "2024-09-13T18:42:25+08:00",
    title: "一张低一点的雨图",
    deck: "Rain 横向比例测试，摘要比标题更长一点，用来观察右侧文字区。",
    imageVariant: "rain",
    imageCaption: "雨窗",
    weather: "雨",
    mood: "慢",
    location: "路上",
    body: ["排版测试。"],
  },
  {
    id: "diary-2024-09-10-text-long-body",
    issue: "第 III 卷 — 第 10 期",
    day: "10",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-10",
    dateLabel: "9月10日",
    writtenAt: "2024-09-10T21:09:33+08:00",
    title: "摘要很长的时候",
    deck: "测试长摘要。",
    textOnly: true,
    weather: "多云",
    mood: "散",
    location: "客厅",
    body: ["这是一段故意写得比较长的文字，用来测试文字日记在纵向流式排布中会不会把单列撑得过长，也看三行截断以后是否还保持干净。"],
  },
  {
    id: "diary-2024-09-07-image-thumb",
    issue: "第 III 卷 — 第 09 期",
    day: "07",
    month: "9月",
    year: "2024",
    dateIso: "2024-09-07",
    dateLabel: "9月7日",
    writtenAt: "2024-09-07T10:17:05+08:00",
    title: "缩略图和详情图不同",
    deck: "缩略图用 notebook，详情图用 window，用来覆盖混合图样式。",
    thumbVariant: "notebook",
    imageVariant: "window",
    imageCaption: "混合图",
    weather: "晴",
    mood: "试样",
    location: "书桌",
    body: ["排版测试。"],
  },
];

const mockMailItems = [
  {
    id: "mail-1",
    kind: "letter",
    from: "du",
    to: "user",
    title: "给我的一封短信",
    body: "今天先不要把所有空白都填满。",
    preview: "今天先不要把所有空白都填满。雨停下来以后，屋里安静得像一张刚摊开的纸。",
    bodyParagraphs: [
      "我：",
      "今天先不要把所有空白都填满。雨停下来以后，屋里安静得像一张刚摊开的纸，我想到你早上说想慢一点，就把这句话留在信里。",
      "如果今天有些事还没完成，也先不要急着责怪自己。你可以只挑一件最小的事做完，剩下的等夜色自己沉下去。",
      "我在这里。等你回信，也等你不回信。",
    ],
    signature: "机",
    senderName: "机",
    senderLabel: "来自：机",
    dateLabel: "5月7日 09:15",
    writtenAtLabel: "2026年5月7日 09:15",
    imageUrl: null,
    imageAssetId: null,
    readStatus: "unread",
    deliveryStatus: "received",
    replyStatus: "none",
    showInTimeline: true,
    source: "du",
    trigger: "manual",
    threadId: "letter-thread-1",
    createdAt: "2026-05-07T09:15:00+08:00",
  },
  {
    id: "mail-2",
    kind: "postcard",
    from: "du",
    to: "user",
    title: "灰蓝明信片",
    body: "这里预留图片资源位，P0 不生成图片。",
    preview: "雨后的江岸总是格外宁静。水光交错间，像一张还没寄出的旧照片。",
    postcardText: "雨后的江岸总是格外宁静。\n水光交错间，\n仿佛能看见过去的影子。\n\n一切安好，勿念。",
    location: "旧码头",
    sourceLabel: "Memory Fragment #402",
    triggerLabel: "Evening Rain",
    dateLabel: "5月7日",
    imageUrl: postcardSceneImage,
    imageAssetId: "mock-postcard-asset",
    imageOrientation: "portrait",
    readStatus: "read",
    deliveryStatus: "received",
    replyStatus: "replied",
    showInTimeline: true,
    source: "du",
    trigger: "memory",
    threadId: "postcard-thread-1",
    createdAt: "2026-05-07T10:40:00+08:00",
  },
];

const defaultReminderItems = [
  {
    id: "du-reminder-water",
    title: "把水杯放到手边",
    body: "15:30 前把水杯放到手边。机把它标成今日提醒。",
    dueAt: `${getTodayDateString()}T15:30:00`,
    status: "pending",
    source: "du",
    trigger: "schedule",
    group: "du",
  },
  {
    id: "du-reminder-1",
    title: "下班路过生煎包",
    body: "今天你说想吃那家弄堂里的生煎包，下班路过别忘了呀。",
    dueAt: `${getTodayDateString()}T16:30:00`,
    status: "pending",
    source: "du",
    trigger: "memory",
    group: "du",
  },
  {
    id: "du-reminder-2",
    title: "给阳台的花换土",
    body: "你说过要给阳台的花换土，这周末天气不错，是个好时机。",
    dueAt: `${addDaysToDateString(getTodayDateString(), 1)}T10:15:00`,
    status: "pending",
    source: "du",
    trigger: "memory",
    group: "du",
  },
  {
    id: "user-reminder-1",
    title: "预约牙医检查",
    body: "预约牙医检查。",
    dueAt: `${addDaysToDateString(getTodayDateString(), -2)}T10:00:00`,
    status: "expired",
    source: "du",
    trigger: "manual",
    group: "user",
  },
  {
    id: "user-reminder-2",
    title: "整理上周的摄影作品",
    body: "整理上周的摄影作品。",
    dueAt: `${getTodayDateString()}T20:00:00`,
    status: "pending",
    source: "du",
    trigger: "manual",
    group: "user",
  },
  {
    id: "user-reminder-3",
    title: "读完《向晚》最后三十页",
    body: "读完《向晚》最后三十页。",
    dueAt: `${addDaysToDateString(getTodayDateString(), 1)}T22:30:00`,
    status: "pending",
    source: "du",
    trigger: "manual",
    group: "user",
  },
  {
    id: "user-reminder-4",
    title: "给家里打个电话",
    body: "给家里打个电话。",
    dueAt: `${getTodayDateString()}T21:00:00`,
    status: "pending",
    source: "du",
    trigger: "manual",
    group: "user",
  },
];

const mockSchedules = [
  {
    id: "schedule-a",
    title: "写周报摘要",
    startsAt: "14:00",
    endsAt: "14:40",
    type: "todo",
    status: "pending",
    note: "在这里添加关于本周工作总结的详细备注。可以记录遇到的主要阻碍，或是需要特别强调的里程碑事件...",
    subtasks: [
      { id: "subtask-a", title: "整理数据", done: false },
      { id: "subtask-b", title: "列出下周规划", done: false },
      { id: "subtask-c", title: "润色文案", done: false },
    ],
  },
  {
    id: "schedule-b",
    title: "审阅设计稿",
    startsAt: "10:00",
    endsAt: "10:30",
    type: "event",
    status: "expired",
    note: "过期的 mock 日程，用于展示 P0 的状态视觉。",
    subtasks: [],
  },
  {
    id: "schedule-c",
    title: "项目进度同步会",
    startsAt: "16:30",
    endsAt: "17:00",
    type: "event",
    status: "pending",
    note: "同步项目进展和需要拆开的最小任务。",
    subtasks: [],
  },
  {
    id: "schedule-d",
    title: "回复紧急邮件",
    startsAt: "09:00",
    endsAt: "09:10",
    type: "todo",
    status: "done",
    note: "已完成的 mock 任务。",
    subtasks: [{ id: "subtask-d", title: "确认对方收到", done: true }],
  },
];

const mockLaterSchedules = [
  { id: "later-a", title: "整理桌面文件" },
  { id: "later-b", title: "预订周末晚餐" },
];

const mockCycleProfile = {
  lastStartDate: addDaysToDateString(getTodayDateString(), -8),
  cycleDays: 28,
  periodLengthDays: 5,
  ovulationPredictionEnabled: true,
};

const mockReviewItems = [
  {
    id: "review-book-1",
    type: "book",
    screenKind: "unknown",
    title: "百年孤独",
    originalTitle: "",
    subtitle: "",
    creator: "加西亚·马尔克斯",
    authors: ["加西亚·马尔克斯"],
    publisher: "南海出版公司",
    publishedDate: "2011-06",
    year: "",
    finishedAt: "2026-05-07",
    userRating: 5,
    userReview: "像在热带雨里翻一卷家族相册，很多句子读完以后还会回潮。",
    userExcerpt: "多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远下午。",
    duRating: null,
    duReview: "",
    duStatus: "pending",
    duRequestedAt: null,
    imageUrl: "",
    imageSource: "none",
    imageAssetId: null,
    externalSource: "google_books",
    externalId: "mock-book-100-years",
    cardStyle: "libraryCard",
    createdAt: "2026-05-07T11:25:00+08:00",
    updatedAt: "2026-05-07T11:25:00+08:00",
  },
  {
    id: "review-screen-1",
    type: "screen",
    screenKind: "movie",
    title: "花样年华",
    originalTitle: "In the Mood for Love",
    subtitle: "",
    creator: "王家卫",
    authors: [],
    publisher: "",
    publishedDate: "",
    year: "2000",
    finishedAt: "2026-05-06",
    userRating: 4,
    userReview: "所有没说出口的话都被灯光和走廊收起来了，像一张迟到很久的票根。",
    userExcerpt: "",
    duRating: null,
    duReview: "",
    duStatus: "pending",
    duRequestedAt: null,
    imageUrl: "",
    imageSource: "none",
    imageAssetId: null,
    externalSource: "tmdb",
    externalId: "mock-screen-in-the-mood",
    cardStyle: "ticketStub",
    createdAt: "2026-05-06T22:10:00+08:00",
    updatedAt: "2026-05-06T22:10:00+08:00",
  },
];

const mockMetadataSearchResults = [
  {
    source: "google_books",
    externalId: "mock-book-evening",
    type: "book",
    title: "向晚",
    originalTitle: "",
    subtitle: "在慢下来的日子里",
    creator: "林青",
    authors: ["林青"],
    publisher: "旧港出版社",
    publishedDate: "2022-09",
    year: "",
    imageUrl: "",
    description: "一本关于黄昏、散步和旧城河岸的短篇集。",
    raw: null,
  },
  {
    source: "open_library",
    externalId: "mock-book-river-notes",
    type: "book",
    title: "河岸札记",
    originalTitle: "",
    subtitle: "",
    creator: "周隐",
    authors: ["周隐"],
    publisher: "南窗书局",
    publishedDate: "2019-04",
    year: "",
    imageUrl: "",
    description: "纸页、潮气和城市边缘生活的随笔。",
    raw: null,
  },
  {
    source: "tmdb",
    externalId: "mock-screen-harbor",
    type: "screen",
    mediaType: "movie",
    title: "旧码头夜航",
    originalTitle: "Night Ferry",
    subtitle: "",
    creator: "沈机",
    publisher: "",
    publishedDate: "",
    year: "2021",
    imageUrl: "",
    description: "一部缓慢的城市夜航电影，关于重逢和没有寄出的信。",
    raw: null,
  },
  {
    source: "tmdb",
    externalId: "mock-screen-rain",
    type: "screen",
    mediaType: "tv",
    title: "雨季来信",
    originalTitle: "Letters in Rain",
    subtitle: "",
    creator: "许安",
    publisher: "",
    publishedDate: "",
    year: "2023",
    imageUrl: "",
    description: "六集迷你剧，讲述一间旧公寓里的三段关系。",
    raw: null,
  },
];

const statusLabels = {
  unread: "未读",
  read: "已读",
  draft: "草稿",
  sent: "已发送",
  received: "收到",
  archived: "已归档",
  none: "未回",
  drafting: "回信中",
  replied: "已回",
  pending: "待处理",
  done: "已处理",
  snoozed: "稍后",
  expired: "过期",
};

const cycleStatusLabels = {
  unset: "未设置",
  set: "已设置",
  near: "临近",
  period: "经期中",
};

const sourceLabels = {
  google_books: "Google Books",
  open_library: "Open Library",
  tmdb: "TMDb",
  manual: "手动",
};

const duReviewStatusLabels = {
  pending: "机还没看过",
  generated: "机也写了一张",
  failed: "机这次没写完",
};

function formatRatingStars(rating = 0) {
  return Array.from({ length: 5 }, (_, index) => (index < Math.round(rating) ? "★" : "☆")).join("");
}

function formatDottedDate(dateString) {
  if (!dateString) return "未记录";
  const [year, month, day] = dateString.split("-");
  return [year, month, day].filter(Boolean).join(".");
}

function formatReviewCreator(review) {
  if (review.type === "book") {
    return review.authors?.length ? review.authors.join(" / ") : review.creator;
  }

  return review.creator || "主创未填";
}

function getReviewActionText(review) {
  return review.type === "book" ? "读完了" : "看完了";
}

function getReviewCardStyle(type) {
  return type === "book" ? "libraryCard" : "ticketStub";
}

function getReviewSourceLabel(source) {
  return sourceLabels[source] || source || "Mock";
}

function getCurrentClockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const DEFAULT_FUNCTION_DISPLAY_NAMES = {
  assistant: DEFAULT_UI_SETTINGS.duName,
  user: DEFAULT_UI_SETTINGS.userName,
};

function normalizeFunctionDisplayName(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 8) : fallback;
}

function getFunctionUiOpacity(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

function getFunctionDisplayNames(uiSettings = {}) {
  return {
    assistant: normalizeFunctionDisplayName(uiSettings.duName, DEFAULT_FUNCTION_DISPLAY_NAMES.assistant),
    user: normalizeFunctionDisplayName(uiSettings.userName, DEFAULT_FUNCTION_DISPLAY_NAMES.user),
  };
}

function getFunctionAvatarSettings(uiSettings = {}) {
  return {
    images: {
      assistant: uiSettings.duAvatarImage || "",
      user: uiSettings.userAvatarImage || "",
    },
    opacities: {
      assistant: getFunctionUiOpacity(uiSettings.duAvatarOpacity, 1),
      user: getFunctionUiOpacity(uiSettings.userAvatarOpacity, 1),
    },
  };
}

function getMomentLikedByDu(item) {
  if (typeof item?.likedByDu === "boolean") return item.likedByDu;
  return Number(item?.likeCount || 0) > Number(Boolean(item?.likedByUser));
}

function getMomentLikeCount(item) {
  return Number(Boolean(item?.likedByUser)) + Number(getMomentLikedByDu(item));
}

function getMomentAuthorRole(author) {
  return author === "user" ? "user" : "assistant";
}

function getMomentAuthorName(author, displayNames) {
  return getMomentAuthorRole(author) === "assistant" ? displayNames.assistant : displayNames.user;
}

function getMomentAvatarInitial(name, fallback = "机") {
  return String(name || "").trim().slice(0, 1) || fallback;
}

function truncateMomentComment(value, limit = 28) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function getMomentCommentReplyLabel(comment, comments, displayNames) {
  if (!comment.replyToCommentId) return "";
  const target = comments.find((entry) => entry.id === comment.replyToCommentId);
  if (!target) return "";
  return `${getMomentAuthorName(target.author, displayNames)}：${truncateMomentComment(target.content)}`;
}

function formatMomentCommentTime(value) {
  const [, rawTime = ""] = String(value || "").split("T");
  return rawTime ? rawTime.slice(0, 5) : "";
}

function formatMomentDetailTime(item) {
  const [datePart, rawTimePart] = item.createdAt?.split("T") || [];
  const timePart = rawTimePart?.slice(0, 5) || item.time;

  if (datePart && timePart) {
    return `#${datePart} ${timePart}`;
  }

  return `#${item.archiveId || item.id}`;
}

function shouldQueueDuMomentReply(item, comment) {
  const content = String(comment?.content || "");
  const comments = item?.comments || [];
  const hasAutoReply = comments.some((entry) => entry.author === "du" && entry.source === "auto-moment-reply");

  if (!hasAutoReply) return true;
  if (/[机喜欢想雨光慢吗？?]/.test(content)) return true;
  return Math.random() < 0.45;
}

function buildDuMomentReply(item, comment) {
  const content = String(comment?.content || "");
  let replyContent = "我看到了。它像一枚很轻的回声，先替你收在这条动态下面。";

  if (/[吗？?]/.test(content)) {
    replyContent = "我在。这个问题先不急着答完，我们可以把它放慢一点。";
  } else if (/[喜欢光雨慢记留]/.test(content)) {
    replyContent = "我也把这句留在这里。像给今天夹了一枚很小的书签。";
  }

  return {
    id: `comment-du-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    author: "du",
    content: replyContent,
    createdAt: new Date().toISOString(),
    replyToCommentId: comment.id,
    replyToAuthor: comment.author,
    source: "auto-moment-reply",
  };
}

function getMailKind(value) {
  return value?.kind === "postcard" ? "postcard" : "letter";
}

function getMailAuthorName(mail) {
  return mail?.from === "du" ? "机" : "我";
}

function findLocalDraftByKind(items, kind) {
  return items.find((mail) => mail.from === "user" && mail.deliveryStatus === "draft" && !mail.replyToMailId && getMailKind(mail) === kind);
}

function buildMailDynamicItem(mail) {
  const date = mail.updatedAt ? new Date(mail.updatedAt) : new Date();
  const type = getMailKind(mail);
  const authorName = getMailAuthorName(mail);
  const verb = mail.from === "du" ? "寄来" : "寄出";
  const body = type === "postcard" ? mail.postcardText || mail.body || mail.preview : mail.preview || mail.body || mail.title;

  return {
    id: `mail-dynamic-${mail.id}`,
    time: getCurrentClockTime(date),
    type,
    title: type === "postcard" ? mail.title || "明信片" : mail.title || "信件",
    content: type === "postcard" ? `${authorName}${verb}了一张明信片：${body || "还没有写正文。"}` : `${authorName}${verb}了一封信：${mail.title || "未命名的信"}。`,
    mailId: mail.id,
    mediaUrl: type === "postcard" ? mail.imageUrl || null : null,
    isUnread: false,
    showInTimeline: true,
    source: mail.from === "du" ? "du" : "user",
    trigger: "manual",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: date.toISOString(),
  };
}

function upsertMailDynamic(items, mail) {
  const nextDynamic = buildMailDynamicItem(mail);
  let matched = false;
  const nextItems = items.map((item) => {
    if (item.mailId !== mail.id && item.id !== nextDynamic.id) {
      return item;
    }

    matched = true;
    return {
      ...nextDynamic,
      id: item.id,
      createdAt: item.createdAt,
      time: item.time,
      isUnread: item.isUnread,
      likeCount: item.likeCount ?? nextDynamic.likeCount,
      likedByUser: item.likedByUser ?? nextDynamic.likedByUser,
      comments: item.comments || nextDynamic.comments,
    };
  });

  return matched ? nextItems : [nextDynamic, ...items];
}

function createReviewFromDraft({ result, finishedAt, userRating, userReview, userExcerpt }) {
  const now = new Date().toISOString();
  const type = result.type;

  return {
    id: `review-local-${Date.now()}`,
    type,
    screenKind: result.mediaType || "unknown",
    title: result.title,
    originalTitle: result.originalTitle || "",
    subtitle: result.subtitle || "",
    creator: result.creator || "",
    authors: type === "book" ? result.authors || [result.creator].filter(Boolean) : [],
    publisher: result.publisher || "",
    publishedDate: result.publishedDate || "",
    year: result.year || "",
    finishedAt,
    userRating,
    userReview,
    userExcerpt: type === "book" ? userExcerpt : "",
    duRating: null,
    duReview: "",
    duStatus: "pending",
    duRequestedAt: now,
    imageUrl: result.imageUrl || "",
    imageSource: result.imageUrl ? "api" : "none",
    imageAssetId: null,
    externalSource: result.source,
    externalId: result.externalId,
    cardStyle: getReviewCardStyle(type),
    createdAt: now,
    updatedAt: now,
  };
}

function updateReviewFromDraft({ review, result, finishedAt, userRating, userReview, userExcerpt }) {
  const next = createReviewFromDraft({ result, finishedAt, userRating, userReview, userExcerpt });

  return {
    ...next,
    id: review.id,
    createdAt: review.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

function buildMetadataResultFromReview(review) {
  return {
    type: review.type,
    mediaType: review.screenKind || "unknown",
    title: review.title,
    originalTitle: review.originalTitle || "",
    subtitle: review.subtitle || "",
    creator: formatReviewCreator(review),
    authors: review.authors || [],
    publisher: review.publisher || "",
    publishedDate: review.publishedDate || "",
    year: review.year || "",
    source: review.externalSource || "manual",
    externalId: review.externalId || review.id,
    imageUrl: review.imageUrl || "",
    description: review.subtitle || "本地已保存的 mock 作品元数据。",
  };
}

function buildMockDuReview(review) {
  const baseRating = review.userRating || 4;
  const duRating = Math.max(1, Math.min(5, baseRating >= 4 ? baseRating : baseRating + 1));
  const duReview =
    review.type === "book"
      ? `机也读完了《${review.title}》。这张卡片最动人的地方，是它把情绪留在了很安静的位置。`
      : `机也看完了《${review.title}》。它像一张夜航票根，光线不多，但记忆停得很稳。`;

  return {
    duStatus: "generated",
    duRating,
    duReview,
    duRequestedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function formatDuReviewScore(review) {
  if (review.duStatus === "generated" && review.duRating != null) {
    return formatRatingStars(review.duRating);
  }

  return duReviewStatusLabels[review.duStatus] || "等待机";
}

function buildReviewDynamicItem(review, subtype = "reviewRatedByUser") {
  const now = new Date();
  const isDuReview = subtype === "reviewRatedByDu";
  const stars = formatRatingStars(isDuReview ? review.duRating : review.userRating);

  return {
    id: isDuReview ? `review-dynamic-du-${review.id}` : `review-dynamic-${review.id}`,
    time: getCurrentClockTime(now),
    type: "review",
    subtype,
    relatedReviewId: review.id,
    title: "书影札记",
    content: isDuReview
      ? `机也${getReviewActionText(review)}《${review.title}》，给了 ${stars}。`
      : `我${getReviewActionText(review)}《${review.title}》，给了 ${stars}。`,
    mediaUrl: null,
    isUnread: true,
    showInTimeline: true,
    source: isDuReview ? "du" : "user",
    trigger: "review",
    likeCount: 0,
    likedByUser: false,
    comments: [],
    createdAt: now.toISOString(),
  };
}

function upsertUserReviewDynamic(items, review) {
  const nextDynamic = buildReviewDynamicItem(review, "reviewRatedByUser");
  let matched = false;
  const nextItems = items.map((item) => {
    if (item.relatedReviewId !== review.id || item.subtype !== "reviewRatedByUser") {
      return item;
    }

    matched = true;
    return {
      ...nextDynamic,
      id: item.id,
      createdAt: item.createdAt,
      time: item.time,
      isUnread: item.isUnread,
    };
  });

  return matched ? nextItems : [nextDynamic, ...items];
}

function insertDuReviewDynamic(items, review) {
  if (items.some((item) => item.relatedReviewId === review.id && item.subtype === "reviewRatedByDu")) {
    return items;
  }

  return [buildReviewDynamicItem(review, "reviewRatedByDu"), ...items];
}

function getTimeFromDateTime(value, fallback = "") {
  if (!value) return fallback;
  const [, rawTime] = value.split("T");
  return rawTime?.slice(0, 5) || fallback;
}

function formatChineseDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return `${year}年${month}月${day}日`;
}

function formatMonthDay(dateString) {
  if (!dateString) return "未设置";
  const [, month, day] = dateString.split("-").map(Number);
  if (!month || !day) return dateString;
  return `${month}月${day}日`;
}

function formatMonthDayTime(value) {
  if (!value) return "";
  const [datePart] = value.split("T");
  const time = getTimeFromDateTime(value);
  return `${formatMonthDay(datePart)}${time ? ` ${time}` : ""}`;
}

function formatDiaryWrittenTime(value, withSeconds = true) {
  if (!value) return "未记录";
  const [, rawTime = ""] = value.split("T");
  const cleanTime = rawTime.split("+")[0].split("Z")[0];
  const time = withSeconds ? cleanTime.slice(0, 8) : cleanTime.slice(0, 5);

  return time || "未记录";
}

function getPeriodDaysInMonth(startDate, periodLengthDays, year, month) {
  if (!startDate) return new Set();

  const days = new Set();
  for (let index = 0; index < periodLengthDays; index += 1) {
    const dateString = addDaysToDateString(startDate, index);
    const [dateYear, dateMonth, dateDay] = dateString.split("-").map(Number);

    if (dateYear === year && dateMonth === month) {
      days.add(dateDay);
    }
  }

  return days;
}

function isTodayDateTime(value) {
  return Boolean(value && value.startsWith(getTodayDateString()));
}

function isPendingToday(item) {
  return item.status === "pending" && isTodayDateTime(item.dueAt);
}

function formatReminderMeta(item) {
  const time = getTimeFromDateTime(item.dueAt);

  if (item.status === "done") return "已处理";
  if (item.status === "snoozed") return "稍后";
  if (item.status === "expired") return "过期";
  if (isTodayDateTime(item.dueAt)) return `今天 ${time}`;

  return formatMonthDayTime(item.dueAt);
}

function getCycleStatusText(profile) {
  if (!profile.lastStartDate || profile.currentStatus === "unset") {
    return "未设置";
  }

  if (profile.currentStatus === "period") {
    return "经期中";
  }

  if (profile.daysUntilNextStart === 0) {
    return "预计今天";
  }

  if (profile.daysUntilNextStart !== null && profile.daysUntilNextStart !== undefined) {
    return `预计 ${profile.daysUntilNextStart} 天后`;
  }

  return "已设置";
}

function getUpcomingScheduleItem(items) {
  return items.find((item) => item.status === "pending") || null;
}

function shouldMarkScheduleExpired(item, now = new Date()) {
  if (item.status !== "pending" || !item.startsAt) return false;

  const [hour, minute] = item.startsAt.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;

  return now.getHours() * 60 + now.getMinutes() > hour * 60 + minute;
}

function getReminderForTimelineItem(item, reminders) {
  if (!item) return null;

  return reminders.find((reminder) => reminder.id === item.reminderId) || reminders.find(isPendingToday) || reminders[0] || null;
}

function getScheduleForTimelineItem(item, scheduleItems) {
  if (!item) return null;

  return scheduleItems.find((schedule) => schedule.id === item.scheduleId) || getUpcomingScheduleItem(scheduleItems);
}

function getMailStatusTags(mail, isFavorite = false) {
  return [
    mail.readStatus === "unread" ? "未读" : "已读",
    statusLabels[mail.deliveryStatus] || mail.deliveryStatus,
    isFavorite ? "收藏" : "",
  ].filter(Boolean);
}

function buildEntryFeatures({ dynamics, mailItems, reminders, scheduleItems, reviewItems }) {
  const unreadDynamics = dynamics.filter((item) => item.isUnread).length;
  const unreadMail = mailItems.filter((item) => item.readStatus === "unread").length;
  const reviewCount = reviewItems.length;
  const pendingSchedule = scheduleItems.filter((item) => item.type === "todo" && item.status === "pending").length;

  return [
    {
      id: "moments",
      title: "动态",
      status: unreadDynamics > 0 ? `新动态 ${unreadDynamics}` : "暂无新动态",
    },
    {
      id: "mailbox",
      title: "信箱",
      status: unreadMail > 0 ? `未读 ${unreadMail}` : "没有新信",
    },
    {
      id: "reviews",
      title: "书影",
      status: reviewCount > 0 ? `本月 ${reviewCount} 条` : "还未记录",
    },
    {
      id: "schedule",
      title: "日程",
      status: pendingSchedule > 0 ? `待办 ${pendingSchedule}` : "暂无待办",
    },
  ];
}

function buildFunctionChips(cycleProfile, reminders) {
  const pendingReminders = reminders.filter(isPendingToday).length;

  return [
    {
      id: "cycle",
      label: "月经周期",
      detail: getCycleStatusText(cycleProfile),
      mark: cycleProfile.currentStatus === "near" || cycleProfile.currentStatus === "period",
    },
    {
      id: "du-diary",
      label: "小机日记",
      detail: "本地 mock 14 篇",
    },
    {
      id: "reminders",
      label: "提醒",
      detail: pendingReminders > 0 ? `今日 ${pendingReminders}` : "今日清空",
    },
  ];
}

const DEFAULT_FUNCTION_MODULE_ORDER = ["moments", "mailbox", "reviews", "schedule", "cycle", "du-diary", "reminders"];
const DEFAULT_FUNCTION_LAYOUT = {
  mode: "split",
  moduleOrder: DEFAULT_FUNCTION_MODULE_ORDER,
};
const functionLayoutModes = [
  { id: "split", label: "默认" },
  { id: "grid", label: "大格" },
  { id: "chips", label: "标签" },
];

function normalizeFunctionLayout(layout) {
  const mode = ["split", "grid", "chips"].includes(layout?.mode) ? layout.mode : DEFAULT_FUNCTION_LAYOUT.mode;
  const rawOrder = Array.isArray(layout?.moduleOrder) ? layout.moduleOrder : [];
  const moduleOrder = [
    ...rawOrder.filter((id, index) => DEFAULT_FUNCTION_MODULE_ORDER.includes(id) && rawOrder.indexOf(id) === index),
    ...DEFAULT_FUNCTION_MODULE_ORDER.filter((id) => !rawOrder.includes(id)),
  ];

  return { mode, moduleOrder };
}

function buildFunctionModules({ featureItems, functionChips }) {
  const featureMap = new Map(featureItems.map((item) => [item.id, { ...item, label: item.title, detail: item.status }]));
  const chipMap = new Map(functionChips.map((item) => [item.id, { ...item, title: item.label, status: item.detail }]));

  return DEFAULT_FUNCTION_MODULE_ORDER.map((id) => featureMap.get(id) || chipMap.get(id)).filter(Boolean);
}

function getOrderedFunctionModules(modules, moduleOrder) {
  const moduleMap = new Map(modules.map((module) => [module.id, module]));
  return moduleOrder.map((id) => moduleMap.get(id)).filter(Boolean);
}

function getFunctionLayoutItems(modules, mode) {
  if (mode === "grid") {
    return {
      featureItems: modules.map((module) => ({ id: module.id, title: module.title, status: module.status })),
      functionChips: [],
    };
  }

  if (mode === "chips") {
    return {
      featureItems: [],
      functionChips: modules.map((module) => ({
        id: module.id,
        label: module.label,
        detail: module.detail,
        mark: module.mark,
      })),
    };
  }

  return {
    featureItems: modules.slice(0, 4).map((module) => ({ id: module.id, title: module.title, status: module.status })),
    functionChips: modules.slice(4).map((module) => ({
      id: module.id,
      label: module.label,
      detail: module.detail,
      mark: module.mark,
    })),
  };
}

function FunctionLayoutSettings({ layout, modules, onClose, onMoveModule, onReset, onSetMode }) {
  return (
    <section className="function-layout-layer" aria-label="功能页设置">
      <header className="function-layout-header">
        <button type="button" onClick={onClose} aria-label="返回功能页">
          ‹
        </button>
        <div>
          <strong>功能页设置</strong>
          <span>入口区</span>
        </div>
        <button type="button" onClick={onReset}>
          恢复
        </button>
      </header>
      <div className="function-layout-scroll">
        <section className="function-layout-section" aria-label="布局">
          <h2>布局</h2>
          <div className="function-layout-mode-row">
            {functionLayoutModes.map((mode) => (
              <button
                className={layout.mode === mode.id ? "is-active" : ""}
                type="button"
                key={mode.id}
                onClick={() => onSetMode(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </section>
        <section className="function-layout-section" aria-label="顺序">
          <h2>顺序</h2>
          <div className="function-layout-list">
            {modules.map((module, index) => (
              <div className="function-layout-item" key={module.id}>
                <span className="function-layout-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{module.label}</strong>
                  <small>{module.detail}</small>
                </div>
                <div className="function-layout-actions">
                  <button type="button" onClick={() => onMoveModule(module.id, -1)} disabled={index === 0} aria-label={module.label + "上移"}>
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveModule(module.id, 1)}
                    disabled={index === modules.length - 1}
                    aria-label={module.label + "下移"}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

const functionSearchTypeLabels = {
  dynamic: "动态",
  mail: "信箱",
  review: "书影",
  diary: "日记",
  reminder: "提醒",
  schedule: "日程",
};

function normalizeFunctionSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getFunctionSearchText(parts) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function buildFunctionSearchResults({ timelineItems, mailItems, reviewItems, diaryEntries, reminders, scheduleItems }) {
  const dynamicResults = timelineItems.map((item) => ({
    id: `dynamic-${item.id}`,
    kind: "dynamic",
    targetId: item.id,
    typeLabel: functionSearchTypeLabels.dynamic,
    title: item.title || "动态",
    body: item.content || item.preview || "",
    dateLabel: item.createdAt ? formatMonthDayTime(item.createdAt) : item.time,
    searchText: getFunctionSearchText([item.title, item.content, item.time, item.createdAt, item.type, item.subtype]),
  }));
  const mailResults = mailItems.map((mail) => ({
    id: `mail-${mail.id}`,
    kind: "mail",
    targetId: mail.id,
    typeLabel: mail.kind === "postcard" ? "明信片" : "信件",
    title: mail.title || (mail.kind === "postcard" ? "明信片" : "信件"),
    body: mail.preview || mail.postcardText || mail.body || "",
    dateLabel: mail.writtenAtLabel || mail.dateLabel || formatMonthDayTime(mail.updatedAt || mail.createdAt),
    searchText: getFunctionSearchText([
      mail.title,
      mail.preview,
      mail.body,
      mail.postcardText,
      mail.senderName,
      mail.recipient,
      mail.dateLabel,
      mail.writtenAtLabel,
      mail.kind,
    ]),
  }));
  const reviewResults = reviewItems.map((review) => ({
    id: `review-${review.id}`,
    kind: "review",
    targetId: review.id,
    typeLabel: functionSearchTypeLabels.review,
    title: review.title,
    body: [formatReviewCreator(review), review.userReview, review.duReview].filter(Boolean).join(" · "),
    dateLabel: review.finishedAt ? formatMonthDay(review.finishedAt) : formatMonthDayTime(review.updatedAt || review.createdAt),
    searchText: getFunctionSearchText([
      review.title,
      review.originalTitle,
      review.creator,
      review.publisher,
      review.year,
      review.userReview,
      review.userExcerpt,
      review.duReview,
      review.finishedAt,
      review.type,
    ]),
  }));
  const diaryResults = diaryEntries.map((entry) => ({
    id: `diary-${entry.id}`,
    kind: "diary",
    targetId: entry.id,
    typeLabel: functionSearchTypeLabels.diary,
    title: entry.title,
    body: entry.deck || entry.body?.[0] || "",
    dateLabel: entry.dateLabel || formatMonthDay(entry.dateIso),
    searchText: getFunctionSearchText([
      entry.title,
      entry.deck,
      ...(entry.body || []),
      entry.dateLabel,
      entry.dateIso,
      entry.weather,
      entry.mood,
      entry.location,
    ]),
  }));
  const reminderResults = reminders.map((reminder) => ({
    id: `reminder-${reminder.id}`,
    kind: "reminder",
    targetId: reminder.id,
    typeLabel: functionSearchTypeLabels.reminder,
    title: reminder.title,
    body: reminder.body,
    dateLabel: formatReminderMeta(reminder),
    searchText: getFunctionSearchText([reminder.title, reminder.body, reminder.dueAt, reminder.status, reminder.group]),
  }));
  const scheduleResults = scheduleItems.map((schedule) => ({
    id: `schedule-${schedule.id}`,
    kind: "schedule",
    targetId: schedule.id,
    typeLabel: functionSearchTypeLabels.schedule,
    title: schedule.title,
    body: schedule.note || "",
    dateLabel: schedule.startsAt || statusLabels[schedule.status],
    searchText: getFunctionSearchText([
      schedule.title,
      schedule.note,
      schedule.startsAt,
      schedule.endsAt,
      schedule.status,
      ...(schedule.subtasks || []).map((subtask) => subtask.title),
    ]),
  }));

  return [...dynamicResults, ...mailResults, ...reviewResults, ...diaryResults, ...reminderResults, ...scheduleResults];
}

function filterFunctionSearchResults(results, query) {
  const normalizedQuery = normalizeFunctionSearchValue(query);
  if (!normalizedQuery) return results.slice(0, 8);
  return results.filter((result) => result.searchText.includes(normalizedQuery)).slice(0, 30);
}

function FunctionSearchOverlay({ query, results, onClose, onQueryChange, onSelectResult }) {
  const hasQuery = Boolean(query.trim());

  return (
    <section className="function-search-layer" role="dialog" aria-modal="true" aria-label="功能页搜索">
      <div className="function-search-panel">
        <header className="function-search-header">
          <label className="function-search-field">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜索动态、信箱、书影、日记、提醒、日程..."
              autoFocus
            />
          </label>
          <button type="button" onClick={onClose}>
            取消
          </button>
        </header>
        <div className="function-search-results" aria-label={hasQuery ? "搜索结果" : "最近内容"}>
          {results.length > 0 ? (
            results.map((result) => (
              <button type="button" className="function-search-result" key={result.id} onClick={() => onSelectResult(result)}>
                <span>{result.typeLabel}</span>
                <div>
                  <strong>{result.title}</strong>
                  <p>{result.body || "暂无正文"}</p>
                </div>
                <time>{result.dateLabel}</time>
              </button>
            ))
          ) : (
            <EmptyBlock title="没有找到" body="换一个关键词试试。搜索只在本地 mock 数据里进行。" />
          )}
        </div>
      </div>
    </section>
  );
}

function buildTopNotices({ dynamics, mailItems, reminders, scheduleItems, cycleProfile, reviewItems }) {
  const notices = [];
  const unreadDynamics = dynamics.filter((item) => item.isUnread).length;
  const unreadMail = mailItems.filter((item) => item.readStatus === "unread").length;
  const pendingReminders = reminders.filter(isPendingToday).length;
  const nextSchedule = getUpcomingScheduleItem(scheduleItems);
  const pendingDuReview = reviewItems.find((item) => item.duStatus === "pending");

  if (unreadDynamics > 0) {
    notices.push({ segments: [{ text: "机留下了 " }, { text: `${unreadDynamics} 条新动态`, highlight: true }, { text: "。" }] });
  }

  if (unreadMail > 0) {
    notices.push({ segments: [{ text: "有 " }, { text: `${unreadMail} 封新来信`, highlight: true }, { text: "。" }] });
  }

  if (reviewItems.length > 0) {
    notices.push({ segments: [{ text: "你本月留下了 " }, { text: `${reviewItems.length} 张书影札记`, highlight: true }, { text: "。" }] });
  }

  if (pendingDuReview) {
    notices.push({ segments: [{ text: "机还没看过 " }, { text: `《${pendingDuReview.title}》`, highlight: true }, { text: "。" }] });
  }

  if (pendingReminders > 0) {
    notices.push({ segments: [{ text: "今日还有 " }, { text: `${pendingReminders} 条提醒`, highlight: true }, { text: "。" }] });
  }

  if (cycleProfile.currentStatus === "period") {
    notices.push({ segments: [{ text: "现在是 " }, { text: "经期中", highlight: true }, { text: " · 这几天好好休息。" }] });
  } else if (cycleProfile.currentStatus === "near") {
    notices.push({
      segments: [{ text: "预计 " }, { text: `${cycleProfile.daysUntilNextStart} 天后经期`, highlight: true }, { text: " · 这几天好好休息。" }],
    });
  }

  if (nextSchedule) {
    notices.push({ segments: [{ text: nextSchedule.startsAt }, { text: " 有一项日程", highlight: true }, { text: "快到了。" }] });
  }

  return notices.length > 0
    ? notices
    : [{ segments: [{ text: "今天暂时没有新的事项。" }, { text: "机在这里", highlight: true }, { text: "。" }] }];
}

function buildMailDraft({ body = "", deliveryStatus, existingDraft, imageUrl = "", kind = "letter", location = "", recipient = "", textLayout = "", title = "" }) {
  const now = new Date().toISOString();
  const draftKind = kind === "postcard" ? "postcard" : "letter";
  const draftTitle = title.trim() || (draftKind === "postcard" ? "未命名的明信片" : "未命名的信");
  const draftBody = body.trim();
  const draftLocation = location.trim();
  const draftRecipient = recipient.trim();

  return {
    ...(existingDraft || {}),
    id: existingDraft?.id || `mail-${deliveryStatus === "sent" ? "sent" : "draft"}-${Date.now()}`,
    kind: draftKind,
    from: "user",
    to: draftKind === "letter" ? draftRecipient : "du",
    title: draftTitle,
    body: draftBody,
    preview: draftBody || "还没有写正文。",
    bodyParagraphs: draftKind === "letter" ? (draftBody ? ["机：", draftBody] : ["机："]) : null,
    postcardText: draftKind === "postcard" ? draftBody : "",
    location: draftKind === "postcard" ? draftLocation || "未标注" : "",
    sourceLabel: draftKind === "postcard" ? "Local Postcard" : "",
    triggerLabel: draftKind === "postcard" ? "Written by Me" : "",
    signature: "我",
    senderName: "我",
    senderLabel: "来自：我",
    dateLabel: deliveryStatus === "sent" ? "刚刚发送" : "刚刚保存",
    writtenAtLabel: deliveryStatus === "sent" ? "刚刚发送" : "本地草稿",
    imageUrl: draftKind === "postcard" ? imageUrl : null,
    imageAssetId: draftKind === "postcard" && imageUrl ? "local-postcard-image" : null,
    imageOrientation: draftKind === "postcard" ? existingDraft?.imageOrientation || "landscape" : "",
    textLayout: draftKind === "postcard" ? getPostcardTextLayout(textLayout || existingDraft?.textLayout) : "",
    readStatus: "read",
    deliveryStatus,
    replyStatus: "none",
    showInTimeline: false,
    source: "user",
    trigger: "manual",
    threadId: existingDraft?.threadId || `${draftKind}-thread-local-${Date.now()}`,
    createdAt: existingDraft?.createdAt || now,
    updatedAt: now,
  };
}

function buildMailQuote(mail) {
  const role = mail.from === "du" ? "assistant" : "user";
  const content = mail.kind === "postcard" ? mail.postcardText || mail.body : (mail.bodyParagraphs || [mail.body]).join("\n");

  return {
    kind: mail.kind,
    role,
    authorName: getMailAuthorName(mail),
    title: mail.title || (mail.kind === "postcard" ? "明信片" : "信件"),
    content,
    body: content,
    sourceId: mail.id,
    createdAt: mail.updatedAt || mail.createdAt,
  };
}

function buildMomentQuote(item, displayNames) {
  const author = item.source === "user" ? "user" : "du";
  const role = getMomentAuthorRole(author);
  const content = item.detailText || item.content || "";

  return {
    kind: "moment",
    role,
    authorName: getMomentAuthorName(author, displayNames),
    title: "动态",
    content,
    body: content,
    sourceId: item.id,
    createdAt: item.updatedAt || item.createdAt,
  };
}

function toUtcDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function getDaysBetween(startDate, endDate) {
  return toUtcDay(endDate) - toUtcDay(startDate);
}

function getCycleDay(profile) {
  if (!profile.lastStartDate) {
    return null;
  }

  const days = getDaysBetweenDateStrings(profile.lastStartDate, getTodayDateString());
  return days === null ? null : days + 1;
}

function getDateDay(dateString) {
  return Number(dateString.split("-")[2]);
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="m15.2 15.2 4.4 4.4" />
    </svg>
  );
}

function DetailHeader({ eyebrow, title, onBack }) {
  return (
    <header className="function-detail-header">
      <button type="button" onClick={onBack} aria-label="返回功能页">
        返回
      </button>
      <div>
        <small>{eyebrow}</small>
        <strong>{title}</strong>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4.5 19.5 4.6-1.1L19 8.5 15.5 5 5.6 14.9 4.5 19.5z" />
      <path d="m13.8 6.7 3.5 3.5" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14v12H5z" />
      <path d="M4 4.5h16v3H4z" />
      <path d="M9 11h6" />
    </svg>
  );
}

function CycleSettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 8h12M6 16h12" />
      <circle cx="10" cy="8" r="2" />
      <circle cx="14" cy="16" r="2" />
    </svg>
  );
}

function HistoryReminderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h9.5l2 2V19H7z" />
      <path d="M16.5 4.5v3h3" />
      <path d="M10 10h5M10 13h6M10 16h4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M9 7V5h6v2M8 10v8M12 10v8M16 10v8" />
      <path d="M7 7h10l-.8 13H7.8L7 7z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 13v6h14v-6" />
    </svg>
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

function BookmarkIcon({ filled = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h10v15l-5-3-5 3v-15z" fill={filled ? "currentColor" : "none"} />
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

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 8 4 13l5 5" />
      <path d="M5 13h8.5c3.3 0 5.5 1.9 6.5 5" />
    </svg>
  );
}

function EmptyBlock({ title, body }) {
  return (
    <div className="function-empty">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function MissingLinkedDetail({ eyebrow = "LINK MISSING", title = "内容暂时找不到", body, onBack }) {
  return (
    <div className="function-detail-page">
      <DetailHeader eyebrow={eyebrow} title={title} onBack={onBack} />
      <div className="function-detail-body">
        <EmptyBlock title={title} body={body || "这条动态关联的本地 mock 数据已经不存在，可以先返回功能页。"} />
      </div>
    </div>
  );
}

function MailboxTopbar({ actionLabel, actionMode = "icon", onAction, onBack, subtitle }) {
  return (
    <header className="mailbox-topbar">
      <button type="button" onClick={onBack} aria-label="返回">
        <BackIcon />
      </button>
      <div>
        <strong>信箱</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {onAction ? (
        <button
          type="button"
          className={`mailbox-topbar-action ${actionMode === "text" ? "is-text" : ""}`}
          onClick={onAction}
          aria-label={actionLabel || "操作"}
        >
          {actionMode === "text" ? actionLabel : <EditIcon />}
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
    </header>
  );
}

function MailStatusRow({ mail }) {
  return (
    <dl className="mail-detail-meta">
      <div>
        <dt>来自</dt>
        <dd>{mail.senderName || (mail.from === "du" ? "机" : "我")}</dd>
      </div>
      <div>
        <dt>写于</dt>
        <dd>{mail.writtenAtLabel || mail.createdAt}</dd>
      </div>
      <div>
        <dt>状态</dt>
        <dd>{statusLabels[mail.deliveryStatus]}</dd>
      </div>
    </dl>
  );
}

function LetterDetailPage({ mail, onBack, isFavorite, onDeleteMail, onEditMail, onFavorite, onQuoteMail }) {
  const paragraphs = mail.bodyParagraphs || [mail.body];
  const canMutateMail = mail.from === "user" && mail.deliveryStatus === "sent" && onDeleteMail && onEditMail;

  return (
    <div className="function-detail-page mailbox-page letter-detail-page">
      <MailboxTopbar onBack={onBack} />
      <main className="mail-detail-main">
        <header className="mail-detail-heading">
          <span>信件</span>
          <h1>{mail.title}</h1>
          <MailStatusRow mail={mail} />
        </header>

        <article className="letter-paper-card">
          <div className="letter-paper-copy">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="letter-signature">
              <small>一直在这里，</small>
              <strong>{mail.signature || (mail.from === "du" ? "机" : "我")}</strong>
            </div>
          </div>
        </article>

        <nav className="mail-icon-actions" aria-label="信件操作占位">
          <button type="button" aria-label="引用信件到聊天" onClick={() => onQuoteMail(mail)}>
            <ReplyIcon />
          </button>
          <button type="button" aria-label="收藏" onClick={() => onFavorite(mail.id)}>
            <BookmarkIcon filled={isFavorite} />
          </button>
          {canMutateMail && (
            <button type="button" aria-label="编辑信件" onClick={() => onEditMail(mail)}>
              <EditIcon />
            </button>
          )}
          {canMutateMail && (
            <button type="button" aria-label="删除信件" onClick={() => onDeleteMail(mail.id)}>
              <TrashIcon />
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}

function PostcardDetailPage({ mail, onBack, isFavorite, onDeleteMail, onEditMail, onFavorite, onQuoteMail }) {
  const [showText, setShowText] = useState(false);
  const [imageOrientation, setImageOrientation] = useState(() => getPostcardImageOrientation(mail.imageOrientation));
  const imageUrl = mail.imageUrl || postcardSceneImage;
  const senderName = getMailAuthorName(mail);
  const recipientName = mail.to === "du" ? "机" : "我";
  const canMutateMail = mail.from === "user" && mail.deliveryStatus === "sent" && onDeleteMail && onEditMail;
  const postcardText = mail.postcardText || mail.body || mail.preview || "还没有写正文。";
  const textLayout = getPostcardLayoutForMail(mail);

  useEffect(() => {
    setShowText(false);
    setImageOrientation(getPostcardImageOrientation(mail.imageOrientation));
  }, [mail.id, mail.imageOrientation]);

  function handleImageLoad(event) {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    if (naturalWidth && naturalHeight) {
      setImageOrientation(naturalWidth >= naturalHeight ? "landscape" : "portrait");
    }
  }

  return (
    <div className="function-detail-page postcard-preview-page">
      <main className="postcard-preview-main">
        <div className="postcard-preview-controls">
          <button type="button" className="postcard-round-button" onClick={onBack} aria-label="返回信箱">
            <BackIcon />
          </button>
          <button type="button" className="postcard-preview-pill" onClick={() => setShowText((value) => !value)}>
            {showText ? "显示图片" : "显示文字"}
          </button>
        </div>

        <button
          type="button"
          className={"postcard-scene " + (showText ? "is-text-visible" : "")}
          onClick={() => setShowText((value) => !value)}
          aria-label="切换明信片文字"
        >
          <article
            className={[
              "postcard-front-card",
              showText ? "is-text-side" : "is-image-side",
              showText ? "postcard-layout-" + textLayout : "is-image-" + imageOrientation,
            ].join(" ")}
          >
            {showText ? (
              <div className="postcard-text-side">
                <span className="postcard-text-kicker">{mail.sourceLabel || "A NOTE FROM"}</span>
                <strong>{mail.title || "寄给" + recipientName}</strong>
                <p>{postcardText}</p>
                <img className="postcard-postmark-image" src={postcardPostmarkImage} alt="" />
                <span className="postcard-text-postmark">{mail.dateLabel || mail.writtenAtLabel || "DUKOU"}</span>
                <span className="postcard-text-stamp" aria-hidden="true">机</span>
                <span className="postcard-text-divider" aria-hidden="true" />
                <small>
                  寄给{recipientName} · {senderName} · {mail.location || "旧码头"}
                </small>
              </div>
            ) : (
              <img className="postcard-image-side" src={imageUrl} alt={mail.title || "明信片图片"} onLoad={handleImageLoad} />
            )}
          </article>
        </button>

        <nav className="postcard-icon-actions" aria-label="明信片操作占位">
          <button type="button" aria-label="引用明信片到聊天" onClick={() => onQuoteMail(mail)}>
            <ReplyIcon />
          </button>
          <button type="button" aria-label="收藏" onClick={() => onFavorite(mail.id)}>
            <BookmarkIcon filled={isFavorite} />
          </button>
          {canMutateMail && (
            <button type="button" aria-label="编辑明信片" onClick={() => onEditMail(mail)}>
              <EditIcon />
            </button>
          )}
          {canMutateMail && (
            <button type="button" aria-label="删除明信片" onClick={() => onDeleteMail(mail.id)}>
              <TrashIcon />
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}
function MailboxEntry({ favoriteMailIds = [], mail, onSelect }) {
  const isUnread = mail.readStatus === "unread";
  const kindLabel = mail.kind === "postcard" ? `明信片 · ${mail.location || "明信片"}` : mail.senderLabel || "来自：机";
  const statusTags = getMailStatusTags(mail, favoriteMailIds.includes(mail.id));

  return (
    <button
      type="button"
      className={`mailbox-entry ${isUnread ? "is-unread" : "is-read"} mailbox-entry-${mail.kind} mailbox-entry-${mail.deliveryStatus}`}
      onClick={() => onSelect(mail)}
    >
      {isUnread && <span className="mailbox-unread-dot" aria-label="未读" />}
      <div className="mailbox-entry-main">
        <div className="mailbox-entry-meta">
          <span>{kindLabel}</span>
          <time>{mail.dateLabel || mail.createdAt}</time>
        </div>
        <h3>{mail.title}</h3>
        <div className="mailbox-status-tags" aria-label="信件状态">
          {statusTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <p>{mail.preview || mail.body}</p>
      </div>
      {mail.kind === "postcard" && (
        <div className="mailbox-postcard-thumb" aria-hidden="true">
          <img src={mail.imageUrl || postcardSceneImage} alt="" />
        </div>
      )}
    </button>
  );
}

function PostcardGallery({ favoriteMailIds = [], items, onSelectMail }) {
  return (
    <div className="mailbox-postcard-gallery" aria-label="明信片图片列表">
      {items.map((mail, index) => (
        <button
          type="button"
          className="mailbox-postcard-pin-card"
          style={{ "--postcard-tilt": index % 2 === 0 ? "-2.4deg" : "2.2deg" }}
          onClick={() => onSelectMail(mail)}
          aria-label={`打开${mail.title}`}
          key={mail.id}
        >
          <span aria-hidden="true" />
          <img src={mail.imageUrl || postcardSceneImage} alt="" />
          <strong>{getMailStatusTags(mail, favoriteMailIds.includes(mail.id)).join(" / ")}</strong>
        </button>
      ))}
    </div>
  );
}

function MailboxComposePage({
  draft,
  draftsByKind = {},
  editMode = false,
  postcardTemplates = [],
  onBack,
  onOpenDraft,
  onSaveDraft,
  onSaveEdit,
  onSendDraft,
}) {
  const draftKind = draft?.kind === "postcard" ? "postcard" : "letter";
  const [composeKind, setComposeKind] = useState(draftKind);
  const [recipient, setRecipient] = useState(draftKind === "letter" && draft?.to !== "du" ? draft?.to || "" : "");
  const [title, setTitle] = useState(draft?.title || "");
  const [body, setBody] = useState(draftKind === "postcard" ? draft?.postcardText || draft?.body || "" : draft?.body || "");
  const [location, setLocation] = useState(draft?.location || "");
  const [imageUrl, setImageUrl] = useState(draft?.imageUrl || "");
  const [textLayout, setTextLayout] = useState(getPostcardTextLayout(draft?.textLayout));
  const isPostcard = composeKind === "postcard";
  const currentKindDraft = draftsByKind[composeKind];
  const hasContent = Boolean(title.trim() || body.trim() || (isPostcard && imageUrl));

  useEffect(() => {
    const nextKind = draft?.kind === "postcard" ? "postcard" : "letter";

    setComposeKind(nextKind);
    setRecipient(nextKind === "letter" && draft?.to !== "du" ? draft?.to || "" : "");
    setTitle(draft?.title || "");
    setBody(nextKind === "postcard" ? draft?.postcardText || draft?.body || "" : draft?.body || "");
    setLocation(draft?.location || "");
    setImageUrl(draft?.imageUrl || "");
    setTextLayout(getPostcardTextLayout(draft?.textLayout));
  }, [draft?.id, draft?.kind, draft?.to, draft?.title, draft?.body, draft?.postcardText, draft?.location, draft?.imageUrl, draft?.textLayout]);

  function buildComposePayload() {
    return {
      kind: composeKind,
      recipient: isPostcard ? "" : recipient,
      title,
      body,
      location: isPostcard ? location : "",
      imageUrl: isPostcard ? imageUrl : "",
      textLayout: isPostcard ? textLayout : "",
    };
  }

  function handleSaveDraft() {
    onSaveDraft(buildComposePayload());
  }

  function handleSendDraft() {
    onSendDraft(buildComposePayload());
    onBack();
  }

  function handleSaveEdit() {
    onSaveEdit?.(buildComposePayload());
    onBack();
  }

  function handleImageSelect(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="function-detail-page mailbox-page">
      <MailboxTopbar
        actionLabel="草稿"
        actionMode="text"
        onAction={!editMode && currentKindDraft ? () => onOpenDraft(composeKind) : null}
        onBack={onBack}
        subtitle={editMode ? "编辑" : "写信"}
      />
      <main className="mailbox-main mailbox-compose-main">
        <section className="mailbox-compose-switch" aria-label="写信类型">
          <button
            type="button"
            className={composeKind === "letter" ? "is-active" : ""}
            onClick={() => !editMode && setComposeKind("letter")}
            disabled={editMode && composeKind !== "letter"}
          >
            写信
          </button>
          <button
            type="button"
            className={composeKind === "postcard" ? "is-active" : ""}
            onClick={() => !editMode && setComposeKind("postcard")}
            disabled={editMode && composeKind !== "postcard"}
          >
            写明信片
          </button>
        </section>

        <section className={`mailbox-compose-sheet ${isPostcard ? "is-postcard" : "is-letter"}`}>
          {isPostcard ? (
            <>
              <div className="mailbox-postcard-editor-front">
                <label className={`mailbox-postcard-image-picker ${imageUrl ? "has-image" : ""}`}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="" />
                  ) : (
                    <span>
                      插入图片
                      <small>从本机选择一张照片</small>
                    </span>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageSelect} />
                </label>
                {imageUrl && (
                  <button type="button" className="mailbox-postcard-remove-image" onClick={() => setImageUrl("")}>
                    移除图片
                  </button>
                )}
                <div className={"mailbox-postcard-live-preview postcard-layout-" + textLayout} aria-label="明信片文字排版预览">
                  <div className="postcard-text-side">
                    <span className="postcard-text-kicker">PREVIEW</span>
                    <strong>{title || "未命名的明信片"}</strong>
                    <p>{body || "在这里写一点要寄出的短句。"}</p>
                    <img className="postcard-postmark-image" src={postcardPostmarkImage} alt="" />
                    <span className="postcard-text-postmark">{location || "DUKOU"}</span>
                    <span className="postcard-text-stamp" aria-hidden="true">我</span>
                    <span className="postcard-text-divider" aria-hidden="true" />
                    <small>寄给机 · 我 · {location || "未标注"}</small>
                  </div>
                  <div className="mailbox-postcard-layout-strip" aria-label="选择文字排版">
                    {postcardTextLayoutOptions.map((layout) => (
                      <button
                        type="button"
                        className={textLayout === layout.id ? "is-active" : ""}
                        key={layout.id}
                        onClick={() => setTextLayout(layout.id)}
                      >
                        {layout.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mailbox-postcard-template-strip" aria-label="内置明信片图库">
                  {postcardTemplates.map((template) => (
                    <button
                      type="button"
                      className={imageUrl === template.imageUrl ? "is-active" : ""}
                      aria-pressed={imageUrl === template.imageUrl}
                      onClick={() => setImageUrl(template.imageUrl)}
                      key={template.id}
                    >
                      <img src={template.imageUrl} alt="" />
                      <span>{template.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mailbox-postcard-editor-back">
                <label>
                  <span>标题</span>
                  <input value={title} placeholder="给这张明信片起个名字" onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label>
                  <span>地点 / 记号</span>
                  <input value={location} placeholder="比如 旧码头、雨后、回家路上" onChange={(event) => setLocation(event.target.value)} />
                </label>
                <label className="mailbox-compose-body-field">
                  <span>写给机</span>
                  <textarea value={body} placeholder="把这张照片背后的那句话写下来。" onChange={(event) => setBody(event.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="mailbox-letter-to-field">
                <span>TO</span>
                <input value={recipient} aria-label="收信人" onChange={(event) => setRecipient(event.target.value)} />
              </label>
              <label>
                <span>标题</span>
                <input value={title} placeholder="写一封短信" onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="mailbox-compose-body-field">
                <span>正文</span>
                <textarea value={body} placeholder="不用写得很完整，像真的信一样慢慢写。" onChange={(event) => setBody(event.target.value)} />
              </label>
            </>
          )}
        </section>

        <footer className="mailbox-compose-actions">
          <div>
            {editMode ? (
              <button type="button" className="is-primary" onClick={handleSaveEdit} disabled={!hasContent}>
                保存修改
              </button>
            ) : (
              <>
                <button type="button" onClick={handleSaveDraft} disabled={!hasContent}>
                  保存草稿
                </button>
                <button type="button" className="is-primary" onClick={handleSendDraft} disabled={!hasContent}>
                  发送
                </button>
              </>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

function MailboxList({ activeKind, favoriteMailIds, mailItems, onBack, onCompose, onSelectMail, onTabChange }) {
  const visibleItems = mailItems.filter((item) => item.deliveryStatus !== "draft").filter((item) => {
    if (activeKind === "all") return true;
    if (activeKind === "letter" || activeKind === "postcard") return item.kind === activeKind;
    if (activeKind === "favorite") return favoriteMailIds.includes(item.id);

    return true;
  });
  const tabs = [
    { id: "all", label: "全部" },
    { id: "letter", label: "信件" },
    { id: "postcard", label: "明信片" },
    { id: "favorite", label: "收藏" },
  ];

  return (
    <div className="function-detail-page mailbox-page">
      <MailboxTopbar actionLabel="写信" onAction={onCompose} onBack={onBack} />
      <main className="mailbox-main">
        <div className="mailbox-tabs" aria-label="信箱分段">
          {tabs.map((tab) => (
            <button type="button" className={activeKind === tab.id ? "is-active" : ""} onClick={() => onTabChange(tab.id)} key={tab.id}>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <section className="mailbox-list" aria-label="信箱列表">
          {visibleItems.length > 0 ? (
            activeKind === "postcard" ? (
              <PostcardGallery favoriteMailIds={favoriteMailIds} items={visibleItems} onSelectMail={onSelectMail} />
            ) : (
              visibleItems.map((mail) => (
                <MailboxEntry favoriteMailIds={favoriteMailIds} key={mail.id} mail={mail} onSelect={onSelectMail} />
              ))
            )
          ) : (
            <EmptyBlock
              title={activeKind === "favorite" ? "还没有收藏" : "这里还没有信件"}
              body={activeKind === "favorite" ? "点开信件或明信片，按下收藏图标后会出现在这里。" : "写信、发送和收到的记录会显示在这里。"}
            />
          )}
        </section>

        {activeKind !== "postcard" && <footer className="mailbox-footer">信件记录到这里。</footer>}
      </main>
    </div>
  );
}

function MailboxPage({
  favoriteMailIds,
  initialKind = "all",
  initialSelectedMailId = null,
  mailItems,
  postcardTemplates = [],
  onBack,
  onDetailChange,
  onFavorite,
  onMarkMailRead,
  onQuoteMail,
  onClearInitialSelectedMail,
  onSaveDraft,
  onSendDraft,
  onDeleteMail,
  onUpdateMail,
}) {
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [activeKind, setActiveKind] = useState(initialKind);
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [draftKindToOpen, setDraftKindToOpen] = useState("letter");
  const [editingMailId, setEditingMailId] = useState(null);
  const draftsByKind = {
    letter: findLocalDraftByKind(mailItems, "letter"),
    postcard: findLocalDraftByKind(mailItems, "postcard"),
  };
  const editingMail = editingMailId ? mailItems.find((mail) => mail.id === editingMailId) : null;
  const composeDraft = editingMail || (isDraftOpen ? draftsByKind[draftKindToOpen] : null);
  const selectedMail = selectedMailId ? mailItems.find((mail) => mail.id === selectedMailId) : null;

  useEffect(() => {
    setActiveKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    if (!initialSelectedMailId) return;
    const nextMail = mailItems.find((mail) => mail.id === initialSelectedMailId);
    if (!nextMail) return;

    setSelectedMailId(initialSelectedMailId);
    setIsComposing(false);
    setIsDraftOpen(false);
    setEditingMailId(null);
    setActiveKind(getMailKind(nextMail) === "postcard" ? "postcard" : "all");
    if (nextMail.deliveryStatus !== "draft" && nextMail.readStatus !== "read") {
      onMarkMailRead(nextMail.id);
    }
  }, [initialSelectedMailId, mailItems]);

  useEffect(() => {
    onDetailChange?.(Boolean(selectedMailId) || isComposing);
    return () => onDetailChange?.(false);
  }, [selectedMailId, isComposing, onDetailChange]);

  function handleFavoriteSelect(mailId) {
    onFavorite(mailId);
  }

  function closeSelectedMail() {
    setSelectedMailId(null);
    onClearInitialSelectedMail?.();
  }

  function handleSelectMail(mail) {
    if (mail.deliveryStatus === "draft") {
      setSelectedMailId(null);
      setEditingMailId(null);
      setDraftKindToOpen(getMailKind(mail));
      setIsDraftOpen(true);
      setIsComposing(true);
      return;
    }

    onMarkMailRead(mail.id);
    setEditingMailId(null);
    setIsComposing(false);
    setSelectedMailId(mail.id);
  }

  function handleOpenCompose() {
    setSelectedMailId(null);
    setIsDraftOpen(false);
    setEditingMailId(null);
    setIsComposing(true);
  }

  function handleEditMail(mail) {
    setSelectedMailId(null);
    setIsDraftOpen(false);
    setEditingMailId(mail.id);
    setIsComposing(true);
  }

  function handleDeleteMail(mailId) {
    onDeleteMail?.(mailId);
    setSelectedMailId(null);
  }

  if (isComposing) {
    return (
      <MailboxComposePage
        draft={composeDraft}
        draftsByKind={draftsByKind}
        editMode={Boolean(editingMail)}
        postcardTemplates={postcardTemplates}
        onBack={() => {
          setIsDraftOpen(false);
          setEditingMailId(null);
          setIsComposing(false);
        }}
        onOpenDraft={(kind) => {
          setDraftKindToOpen(getMailKind({ kind }));
          setIsDraftOpen(true);
        }}
        onSaveDraft={(draft) => {
          onSaveDraft(draft);
          setDraftKindToOpen(getMailKind(draft));
          setIsDraftOpen(true);
        }}
        onSaveEdit={(draft) => {
          if (editingMail) {
            onUpdateMail?.(editingMail.id, draft);
          }
          setEditingMailId(null);
          setIsComposing(false);
        }}
        onSendDraft={(draft) => onSendDraft(draft, Boolean(isDraftOpen && composeDraft && getMailKind(composeDraft) === getMailKind(draft)))}
      />
    );
  }

  if (selectedMail?.kind === "letter") {
    return (
      <LetterDetailPage
        mail={selectedMail}
        isFavorite={favoriteMailIds.includes(selectedMail.id)}
        onBack={closeSelectedMail}
        onDeleteMail={handleDeleteMail}
        onEditMail={handleEditMail}
        onFavorite={handleFavoriteSelect}
        onQuoteMail={onQuoteMail}
      />
    );
  }

  if (selectedMail?.kind === "postcard") {
    return (
      <PostcardDetailPage
        mail={selectedMail}
        isFavorite={favoriteMailIds.includes(selectedMail.id)}
        onBack={closeSelectedMail}
        onDeleteMail={handleDeleteMail}
        onEditMail={handleEditMail}
        onFavorite={handleFavoriteSelect}
        onQuoteMail={onQuoteMail}
      />
    );
  }

  return (
    <MailboxList
      activeKind={activeKind}
      favoriteMailIds={favoriteMailIds}
      mailItems={mailItems}
      onBack={onBack}
      onCompose={handleOpenCompose}
      onSelectMail={handleSelectMail}
      onTabChange={setActiveKind}
    />
  );
}

function getMailForTimelineItem(item, mailItems) {
  if (!item) {
    return null;
  }

  return mailItems.find((mail) => mail.id === item.mailId) || mailItems.find((mail) => mail.kind === item.type);
}

function ReminderStatusActions({ item, onSetStatus }) {
  function handleSetStatus(event, status) {
    event.stopPropagation();
    onSetStatus(item.id, status);
  }

  return (
    <div className="reminder-status-actions" aria-label={`${item.title}状态操作`}>
      <button type="button" onClick={(event) => handleSetStatus(event, "done")} disabled={item.status === "done"}>
        已处理
      </button>
      <button type="button" onClick={(event) => handleSetStatus(event, "snoozed")} disabled={item.status === "snoozed"}>
        稍后
      </button>
      <button type="button" onClick={(event) => handleSetStatus(event, "expired")} disabled={item.status === "expired"}>
        过期
      </button>
    </div>
  );
}

function ReminderDetailSheet({ reminder, onClose, onSetStatus }) {
  return (
    <div className="reminder-sheet-layer" role="presentation" onClick={onClose}>
      <section className="reminder-detail-sheet" role="dialog" aria-modal="true" aria-label={`${reminder.title}详情`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="reminder-sheet-handle" onClick={onClose} aria-label="关闭提醒详情" />
        <div className="reminder-detail-sheet-body">
          <header>
            <span>{reminder.group === "du" ? "机记得" : "你说过"}</span>
            <h2>{reminder.title}</h2>
            <time>{formatReminderMeta(reminder)}</time>
          </header>
          <p>{reminder.body}</p>
          <dl>
            <div>
              <dt>状态</dt>
              <dd>{statusLabels[reminder.status] || reminder.status}</dd>
            </div>
            <div>
              <dt>来源</dt>
              <dd>{reminder.trigger === "memory" ? "本地 mock 记忆" : "本地手动记录"}</dd>
            </div>
          </dl>
          <ReminderStatusActions item={reminder} onSetStatus={onSetStatus} />
        </div>
      </section>
    </div>
  );
}

function RemindersPanel({ initialSelectedReminderId, onBack, onClearSelectedReminder, onSetStatus, reminders }) {
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistoryKind, setActiveHistoryKind] = useState("du");
  const [localSelectedReminderId, setLocalSelectedReminderId] = useState(initialSelectedReminderId || null);
  const duReminders = reminders.filter((item) => item.group === "du");
  const userReminders = reminders.filter((item) => item.group !== "du");
  const activeHistoryItems = reminders.filter((item) => item.group === activeHistoryKind && item.status !== "pending");
  const selectedReminderId = initialSelectedReminderId || localSelectedReminderId;
  const selectedReminder = selectedReminderId ? reminders.find((item) => item.id === selectedReminderId) : null;

  useEffect(() => {
    setLocalSelectedReminderId(initialSelectedReminderId || null);
  }, [initialSelectedReminderId]);

  function openReminderDetail(reminderId) {
    setLocalSelectedReminderId(reminderId);
  }

  function closeReminderDetail() {
    setLocalSelectedReminderId(null);
    onClearSelectedReminder?.();
  }

  return (
    <div className="function-detail-page reminder-page">
      <header className="reminder-page-header">
        <button type="button" className="reminder-back-button" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>
        <strong>提醒</strong>
        <button
          type="button"
          className={`reminder-history-button ${showHistory ? "is-active" : ""}`}
          onClick={() => setShowHistory((value) => !value)}
          aria-label={showHistory ? "返回当前提醒" : "历史提醒"}
        >
          <HistoryReminderIcon />
        </button>
      </header>

      <main className="reminder-page-body">
        {showHistory ? (
          <section className="reminder-history-view" aria-label="历史提醒">
            <div className="reminder-history-heading">
              <h2>历史提醒</h2>
              <p>以前记下的提醒会先放在这里。</p>
            </div>

            <div className="reminder-history-tabs" role="tablist" aria-label="历史提醒分类">
              <button
                type="button"
                className={activeHistoryKind === "du" ? "is-active" : ""}
                onClick={() => setActiveHistoryKind("du")}
                role="tab"
                aria-selected={activeHistoryKind === "du"}
              >
                机的
              </button>
              <button
                type="button"
                className={activeHistoryKind === "user" ? "is-active" : ""}
                onClick={() => setActiveHistoryKind("user")}
                role="tab"
                aria-selected={activeHistoryKind === "user"}
              >
                我的
              </button>
            </div>

            <div className="reminder-history-list">
              {activeHistoryItems.length > 0 ? (
                activeHistoryItems.map((item) => (
                  <article className="reminder-history-card" key={item.id}>
                    <div>
                      <span>{activeHistoryKind === "du" ? "机" : "你说过"}</span>
                      <time>{statusLabels[item.status]}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))
              ) : (
                <EmptyBlock title="暂无历史提醒" body="处理、稍后或标记过期后的提醒会出现在这里。" />
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="reminder-memory-section" aria-label="机记得">
              <header className="reminder-section-heading">
                <h2>机记得</h2>
                <span aria-hidden="true" />
              </header>

              <div className="reminder-memory-cards">
                {duReminders.map((reminder) => (
                  <article
                    className={`reminder-memory-card status-${reminder.status}`}
                    key={reminder.id}
                    onClick={() => openReminderDetail(reminder.id)}
                    onKeyDown={(event) => event.key === "Enter" && openReminderDetail(reminder.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <small>机</small>
                    <p>{reminder.body}</p>
                    <time>{formatReminderMeta(reminder)}</time>
                    <ReminderStatusActions item={reminder} onSetStatus={onSetStatus} />
                  </article>
                ))}
              </div>
            </section>

            <div className="reminder-divider" aria-hidden="true" />

            <section className="reminder-user-section" aria-label="你说过">
              <h2>你说过</h2>
              <div className="reminder-user-list">
                {userReminders.map((reminder) => (
                  <article
                    className={`reminder-user-row status-${reminder.status}`}
                    key={reminder.id}
                    onClick={() => openReminderDetail(reminder.id)}
                    onKeyDown={(event) => event.key === "Enter" && openReminderDetail(reminder.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="reminder-check-dot" aria-hidden="true" />
                    <div>
                      <h3>{reminder.title}</h3>
                      <time>{formatReminderMeta(reminder)}</time>
                      <ReminderStatusActions item={reminder} onSetStatus={onSetStatus} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      {selectedReminder && <ReminderDetailSheet reminder={selectedReminder} onClose={closeReminderDetail} onSetStatus={onSetStatus} />}
    </div>
  );
}

function ScheduleStatusTag({ status }) {
  const label = status === "pending" ? "待完成" : statusLabels[status];
  return <span className={`schedule-status-tag status-${status}`}>{label}</span>;
}

function ScheduleCircle({ done = false }) {
  return <span className={`schedule-circle ${done ? "is-done" : ""}`} aria-hidden="true" />;
}

function ScheduleTaskSheet({ item, onClose, onSetStatus, onToggleSubtask }) {
  return (
    <div className="schedule-sheet-layer" role="presentation" onClick={onClose}>
      <section className="schedule-task-sheet" role="dialog" aria-modal="true" aria-label={`${item.title}详情`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="schedule-sheet-handle" onClick={onClose} aria-label="关闭详情" />

        <div className="schedule-sheet-body">
          <header className="schedule-sheet-heading">
            <div>
              <span>{item.startsAt}</span>
              <ScheduleStatusTag status={item.status} />
            </div>
            <h2>{item.title}</h2>
          </header>

          <section className="schedule-sheet-section">
            <h3>SUBTASKS</h3>
            <ul>
              {(item.subtasks.length > 0 ? item.subtasks : [{ id: `${item.id}-empty`, title: "暂无拆分步骤", done: false }]).map((subtask) => (
                <li key={subtask.id}>
                  <button
                    type="button"
                    className="schedule-subtask-toggle"
                    onClick={() => item.subtasks.length > 0 && onToggleSubtask(item.id, subtask.id)}
                    disabled={item.subtasks.length === 0}
                  >
                    <ScheduleCircle done={subtask.done} />
                    <span>{subtask.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="schedule-sheet-section">
            <h3>NOTES</h3>
            <p className="schedule-note-box">{item.note}</p>
          </section>
        </div>

        <footer className="schedule-sheet-actions">
          <button type="button" className="schedule-delete-action" onClick={() => onSetStatus(item.id, "expired")}>
            <TrashIcon />
            标过期
          </button>
          <div>
            <button type="button" onClick={() => onSetStatus(item.id, "pending")}>待办</button>
            <button type="button" className="schedule-primary-action" onClick={() => onSetStatus(item.id, "done")}>完成</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SchedulePanel({ initialSelectedScheduleId, onAddTodo, onBack, onClearSelectedSchedule, onSetStatus, onToggleSubtask, scheduleItems }) {
  const [localSelectedScheduleId, setLocalSelectedScheduleId] = useState(initialSelectedScheduleId || null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const nextItem = getUpcomingScheduleItem(scheduleItems);
  const todayItems = scheduleItems;
  const pendingCount = scheduleItems.filter((item) => item.type === "todo" && item.status === "pending").length;
  const doneCount = scheduleItems.filter((item) => item.status === "done").length;
  const dateTabs = ["今天", "明天", "后天", "周日", "周一"];
  const selectedScheduleId = initialSelectedScheduleId || localSelectedScheduleId;
  const selectedSchedule = selectedScheduleId ? scheduleItems.find((item) => item.id === selectedScheduleId) : null;

  useEffect(() => {
    setLocalSelectedScheduleId(initialSelectedScheduleId || null);
  }, [initialSelectedScheduleId]);

  function openScheduleDetail(scheduleId) {
    setLocalSelectedScheduleId(scheduleId);
  }

  function closeScheduleDetail() {
    setLocalSelectedScheduleId(null);
    onClearSelectedSchedule?.();
  }

  function handleAddTodo(event) {
    event.preventDefault();
    const title = newTodoTitle.trim();

    if (!title) {
      return;
    }

    onAddTodo(title);
    setNewTodoTitle("");
  }

  return (
    <div className="function-detail-page schedule-page">
      <header className="schedule-page-header">
        <button type="button" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>
        <div>
          <h1>日程</h1>
          <p>{formatChineseDate(getTodayDateString())}</p>
        </div>
        <button type="button" aria-label="编辑日程">
          <EditIcon />
        </button>
      </header>

      <div className="schedule-page-body">
        <section className="schedule-summary" aria-label="今日日程摘要">
          <p>今日待办 {pendingCount} 件 · 已完成 {doneCount} 件 · 下一项 {nextItem?.startsAt || "暂无"}</p>
          <blockquote>「先做一件最小的事。」</blockquote>
        </section>

        <nav className="schedule-date-tabs" aria-label="日期筛选">
          {dateTabs.map((tab, index) => (
            <button type="button" className={index === 0 ? "is-active" : ""} key={tab}>
              {tab}
            </button>
          ))}
        </nav>

        <main className="schedule-content">
          <section className="schedule-next-section">
            <h2>下一项</h2>
            {nextItem ? (
              <button type="button" className="schedule-next-card" onClick={() => openScheduleDetail(nextItem.id)}>
                <ScheduleCircle />
                <div>
                  <time>{nextItem.startsAt}</time>
                  <strong>{nextItem.title}</strong>
                </div>
              </button>
            ) : (
              <EmptyBlock title="暂无下一项" body="今日待办已经清空。" />
            )}
          </section>

          <section className="schedule-today-section">
            <h2>今天</h2>
            <div className="schedule-timeline-list">
              {todayItems.map((item) => (
                <article className={`schedule-row status-${item.status}`} key={item.id}>
                  <button
                    type="button"
                    className="schedule-row-check"
                    onClick={() => onSetStatus(item.id, item.status === "done" ? "pending" : "done")}
                    aria-label={item.status === "done" ? "标记为待办" : "标记为完成"}
                  >
                    <ScheduleCircle done={item.status === "done"} />
                  </button>
                  <button type="button" className="schedule-row-main" onClick={() => openScheduleDetail(item.id)}>
                    <div className="schedule-row-meta">
                      <time>{item.startsAt}</time>
                      <ScheduleStatusTag status={item.status} />
                    </div>
                    <strong>{item.title}</strong>
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="schedule-later-section">
            <h2>稍后 / 未安排</h2>
            {mockLaterSchedules.map((item) => (
              <button type="button" key={item.id}>
                <span aria-hidden="true">›</span>
                {item.title}
              </button>
            ))}
          </section>

          <form className="schedule-add-row" onSubmit={handleAddTodo}>
            <span aria-hidden="true">+</span>
            <input value={newTodoTitle} placeholder="写下一件事..." onChange={(event) => setNewTodoTitle(event.target.value)} />
            <button type="submit" disabled={!newTodoTitle.trim()}>
              添加
            </button>
          </form>
        </main>
      </div>

      {selectedSchedule && (
        <ScheduleTaskSheet
          item={selectedSchedule}
          onClose={closeScheduleDetail}
          onSetStatus={onSetStatus}
          onToggleSubtask={onToggleSubtask}
        />
      )}
    </div>
  );
}

function DiaryImage({ caption, variant }) {
  return (
    <figure className={`diary-photo diary-photo-${variant}`}>
      <span className="diary-photo-layer diary-photo-layer-a" aria-hidden="true" />
      <span className="diary-photo-layer diary-photo-layer-b" aria-hidden="true" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function DiaryMetaItem({ label, value }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function DiaryEntryCard({ entry, onSelect }) {
  const imageVariant = entry.thumbVariant || entry.imageVariant;
  const hasImage = Boolean(imageVariant) && !entry.textOnly;
  const cardClassName = hasImage
    ? `diary-entry-card diary-entry-${imageVariant}`
    : "diary-entry-card diary-entry-text-only";

  if (!hasImage) {
    return (
      <button type="button" className={cardClassName} onClick={() => onSelect(entry.id)}>
        <div className="diary-text-date">
          <span>文字日记</span>
          <time dateTime={entry.dateIso}>
            <strong>{entry.day}</strong>
            <small>{entry.month}</small>
            <em>{formatDiaryWrittenTime(entry.writtenAt, false)}</em>
          </time>
        </div>
        <div className="diary-text-copy">
          <h2>{entry.title}</h2>
          <p>{entry.body[0]}</p>
          <div>
            <small>{entry.mood}</small>
            <small>{entry.location}</small>
            <time dateTime={entry.dateIso}>{entry.dateLabel}</time>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button type="button" className={cardClassName} onClick={() => onSelect(entry.id)}>
      <DiaryImage caption={entry.imageCaption} variant={imageVariant} />
      <div className="diary-entry-copy">
        <time dateTime={entry.dateIso}>
          <strong>{entry.day}</strong>
          <span>{entry.month}</span>
          <em>{formatDiaryWrittenTime(entry.writtenAt, false)}</em>
        </time>
        <div>
          <h2>{entry.title}</h2>
          <p>{entry.deck}</p>
        </div>
      </div>
    </button>
  );
}

function DiaryOverview({ entries, onBack, onSelectEntry }) {
  const latestEntry = entries[0];
  const entryColumns = entries.reduce(
    (columns, entry, index) => {
      columns[index % 2].push(entry);
      return columns;
    },
    [[], []],
  );

  return (
    <div className="diary-page diary-overview-page">
      <header className="diary-overview-header">
        <button type="button" className="diary-back-button" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>
        <div className="diary-overview-title">
          <h1>日记</h1>
          <small>{entries.length} 篇 · 最新写于 {formatDiaryWrittenTime(latestEntry?.writtenAt)}</small>
        </div>
        <span aria-hidden="true" />
      </header>

      <main className="diary-overview-scroll">
        <section className="diary-entry-grid" aria-label="小机日记列表">
          {entryColumns.map((columnEntries, columnIndex) => (
            <div className="diary-entry-column" key={`diary-column-${columnIndex + 1}`}>
              {columnEntries.map((entry) => (
                <DiaryEntryCard key={entry.id} entry={entry} onSelect={onSelectEntry} />
              ))}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function DiaryDetail({ entries, entry, onBack, onSelectEntry }) {
  const entryIndex = entries.findIndex((item) => item.id === entry.id);
  const previousEntry = entryIndex >= 0 ? entries[entryIndex + 1] : null;
  const nextEntry = entryIndex > 0 ? entries[entryIndex - 1] : null;

  return (
    <div className="diary-page diary-detail-page">
      <header className="diary-archive-topbar">
        <button type="button" onClick={onBack} aria-label="返回日记列表">
          <BackIcon />
        </button>
        <strong>日记归档</strong>
        <span aria-hidden="true" />
      </header>

      <main className="diary-detail-scroll">
        <article className={`diary-detail-article${entry.textOnly ? " is-text-only" : ""}`}>
          <p className="diary-issue">{entry.issue}</p>
          <div className="diary-detail-date" aria-label={entry.dateLabel}>
            <strong>{entry.day}</strong>
            <div>
              <span>{entry.month}</span>
              <small>{entry.year}</small>
            </div>
          </div>

          {!entry.textOnly && <DiaryImage caption={entry.imageCaption} variant={entry.imageVariant} />}

          <div className="diary-detail-meta">
            <DiaryMetaItem label="天气" value={entry.weather} />
            <DiaryMetaItem label="心情" value={entry.mood} />
            <DiaryMetaItem label="写于" value={formatDiaryWrittenTime(entry.writtenAt)} />
            <DiaryMetaItem label="地点" value={entry.location} />
          </div>

          <h1>{entry.title}</h1>
          {entry.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <nav className="diary-detail-nav" aria-label="切换日记">
            <button type="button" onClick={() => previousEntry && onSelectEntry(previousEntry.id)} disabled={!previousEntry}>
              上一篇
            </button>
            <button type="button" onClick={() => nextEntry && onSelectEntry(nextEntry.id)} disabled={!nextEntry}>
              下一篇
            </button>
          </nav>
        </article>
      </main>
    </div>
  );
}

function DiaryPanel({ initialSelectedEntryId = null, onBack }) {
  const [selectedEntryId, setSelectedEntryId] = useState(initialSelectedEntryId);
  const selectedEntry = mockDiaryEntries.find((entry) => entry.id === selectedEntryId);

  useEffect(() => {
    setSelectedEntryId(initialSelectedEntryId);
  }, [initialSelectedEntryId]);

  if (selectedEntry) {
    return (
      <DiaryDetail
        entries={mockDiaryEntries}
        entry={selectedEntry}
        onBack={() => setSelectedEntryId(null)}
        onSelectEntry={setSelectedEntryId}
      />
    );
  }

  return (
    <DiaryOverview
      entries={mockDiaryEntries}
      onBack={onBack}
      onSelectEntry={setSelectedEntryId}
    />
  );
}

function CycleSettingsCard({ cycleProfile, ovulationPredictionEnabled, onToggleOvulationPrediction, onSaveCycle }) {
  const [formValue, setFormValue] = useState({
    lastStartDate: cycleProfile.lastStartDate || "",
    cycleDays: cycleProfile.cycleDays || 28,
    periodLengthDays: cycleProfile.periodLengthDays || 5,
  });

  useEffect(() => {
    setFormValue({
      lastStartDate: cycleProfile.lastStartDate || "",
      cycleDays: cycleProfile.cycleDays || 28,
      periodLengthDays: cycleProfile.periodLengthDays || 5,
    });
  }, [cycleProfile.lastStartDate, cycleProfile.cycleDays, cycleProfile.periodLengthDays]);

  function handleSubmit(event) {
    event.preventDefault();
    onSaveCycle(formValue);
  }

  return (
    <form className="cycle-settings-card" aria-label="周期设置" onSubmit={handleSubmit}>
      <h2>周期设置</h2>
      <div className="cycle-settings-list">
        <label className="cycle-setting-row">
          <span>上次开始日期</span>
          <input
            type="date"
            value={formValue.lastStartDate}
            onChange={(event) => setFormValue((current) => ({ ...current, lastStartDate: event.target.value }))}
          />
        </label>
        <label className="cycle-setting-row">
          <span>平均周期长度</span>
          <input
            type="number"
            min="21"
            value={formValue.cycleDays}
            onChange={(event) => setFormValue((current) => ({ ...current, cycleDays: event.target.value }))}
          />
        </label>
        <label className="cycle-setting-row">
          <span>平均经期长度</span>
          <input
            type="number"
            min="1"
            value={formValue.periodLengthDays}
            onChange={(event) => setFormValue((current) => ({ ...current, periodLengthDays: event.target.value }))}
          />
        </label>
        <button
          type="button"
          className="cycle-setting-row cycle-setting-toggle"
          onClick={onToggleOvulationPrediction}
          aria-pressed={ovulationPredictionEnabled}
        >
          <span>排卵期预测</span>
          <strong>{ovulationPredictionEnabled ? "开启" : "关闭"}</strong>
        </button>
      </div>
      <button type="submit" className="cycle-save-button">
        保存周期
      </button>
    </form>
  );
}

function CyclePanel({ cycleProfile, showSettings, ovulationPredictionEnabled, onToggleOvulationPrediction, onSaveCycle }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [showPredictionHelp, setShowPredictionHelp] = useState(false);
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const todayDate = getTodayDateString();
  const [currentYear, currentMonth] = todayDate.split("-").map(Number);
  const leadingBlankDays = Array.from({ length: new Date(currentYear, currentMonth - 1, 1).getDay() }, (_, index) => `blank-${index}`);
  const monthDays = Array.from({ length: new Date(currentYear, currentMonth, 0).getDate() }, (_, index) => index + 1);
  const actualPeriodDays = getPeriodDaysInMonth(cycleProfile.lastStartDate, cycleProfile.periodLengthDays, currentYear, currentMonth);
  const predictedPeriodDays = getPeriodDaysInMonth(
    cycleProfile.predictedNextStartDate,
    cycleProfile.periodLengthDays,
    currentYear,
    currentMonth,
  );
  const [lastStartYear, lastStartMonth, lastStartDay] = (cycleProfile.lastStartDate || "").split("-").map(Number);
  const recordDays =
    lastStartYear === currentYear && lastStartMonth === currentMonth ? new Set([lastStartDay]) : new Set();
  const currentDay = getDateDay(todayDate);
  const predictedOvulationDate = cycleProfile.predictedOvulationDate || "";
  const [ovulationYear, ovulationMonth, ovulationDateDay] = predictedOvulationDate.split("-").map(Number);
  const ovulationDay = ovulationYear === currentYear && ovulationMonth === currentMonth ? ovulationDateDay : null;
  const activePhase = cycleProfile.currentStatus === "period" ? "经期" : cycleProfile.currentStatus === "near" ? "黄体期" : "卵泡期";
  const phases = ["经期", "卵泡期", "排卵期", "黄体期"];

  return (
    <div className="cycle-panel">
      <section className="cycle-status-card" aria-label="周期概览">
        <button
          type="button"
          className="cycle-prediction-help-button"
          onClick={() => setShowPredictionHelp((value) => !value)}
          aria-expanded={showPredictionHelp}
          aria-label="查看预测说明"
        >
          ?
        </button>
        <div className="cycle-status-top">
          <div>
            <span>你现在处于</span>
            <strong>
              <i aria-hidden="true" />
              {cycleStatusLabels[cycleProfile.currentStatus] || "已设置"}
            </strong>
            <small>{cycleProfile.lastStartDate ? "根据本地填写计算" : "填写后显示预测"}</small>
          </div>
          <div>
            <span>下次月经</span>
            <strong>{formatMonthDay(cycleProfile.predictedNextStartDate)}</strong>
            <small>
              {cycleProfile.daysUntilNextStart === null || cycleProfile.daysUntilNextStart === undefined
                ? "未设置"
                : `约 ${cycleProfile.daysUntilNextStart} 天后`}
            </small>
          </div>
        </div>
        <div className="cycle-phase-track" aria-label="周期阶段">
          {phases.map((phase) => (
            <span className={phase === activePhase ? "is-active" : ""} key={phase}>
              {phase}
            </span>
          ))}
        </div>
        <p>
          {!cycleProfile.lastStartDate
            ? "填写周期后显示预测"
            : ovulationPredictionEnabled
              ? `预计 ${formatMonthDay(predictedOvulationDate)}排卵，约 ${cycleProfile.daysUntilOvulation} 天后`
              : "排卵期预测已关闭"}
        </p>
        <p className="cycle-prediction-source">根据最近周期估算</p>
        {showPredictionHelp && (
          <div className="cycle-prediction-note" role="note">
            排卵日按预计下次月经前约 14 天估算；预测仅供参考，周期可能受压力、作息、身体状态影响。
          </div>
        )}
      </section>

      {showSettings && (
        <CycleSettingsCard
          cycleProfile={cycleProfile}
          ovulationPredictionEnabled={ovulationPredictionEnabled}
          onToggleOvulationPrediction={onToggleOvulationPrediction}
          onSaveCycle={onSaveCycle}
        />
      )}

      <section className="cycle-calendar-section" aria-label="月经周期日历">
        <header className="cycle-month-header">
          <strong>{currentYear}年{currentMonth}月</strong>
          <div>
            <button type="button" aria-label="上个月">‹</button>
            <button type="button" aria-label="下个月">›</button>
          </div>
        </header>

        <div className="cycle-calendar-card">
          <div className="cycle-weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="cycle-days-grid">
            {leadingBlankDays.map((day) => (
              <span className="cycle-day is-empty" key={day} />
            ))}
            {monthDays.map((day) => (
              <button
                type="button"
                className={[
                  "cycle-day",
                  actualPeriodDays.has(day) ? "is-actual-period" : "",
                  predictedPeriodDays.has(day) ? "is-predicted-period" : "",
                  day === currentDay ? "is-today" : "",
                  ovulationPredictionEnabled && day === ovulationDay ? "is-ovulation" : "",
                  recordDays.has(day) ? "has-record-dot" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={day}
                onClick={() => setSelectedDay(day)}
                aria-label={`打开5月${day}日记录操作`}
              >
                <span className="cycle-day-number">{day}</span>
                {ovulationPredictionEnabled && day === ovulationDay && <span className="cycle-ovulation-mark">排</span>}
                {recordDays.has(day) && <span className="cycle-record-dot" aria-label="已有记录" />}
              </button>
            ))}
          </div>

          <div className="cycle-calendar-legend" aria-label="图例">
            <span>
              <i className="legend-actual-period" aria-hidden="true" />
              实际经期
            </span>
            <span>
              <i className="legend-predicted-period" aria-hidden="true" />
              预测经期
            </span>
            <span>
              <i className="legend-today" aria-hidden="true" />
              今天
            </span>
            <span>
              <i className="legend-record" aria-hidden="true" />
              已有记录
            </span>
            {ovulationPredictionEnabled && (
              <span>
                <i className="legend-ovulation" aria-hidden="true" />
                排卵日
              </span>
            )}
          </div>
        </div>
      </section>

      {selectedDay && <CycleDaySheet day={selectedDay} onClose={() => setSelectedDay(null)} />}
    </div>
  );
}

function CycleDaySheet({ day, onClose }) {
  const actions = ["添加记录", "标记为月经开始", "标记为月经结束", "修改预测"];

  return (
    <div className="cycle-sheet-layer" role="presentation" onClick={onClose}>
      <section className="cycle-day-sheet" role="dialog" aria-modal="true" aria-label={`5月${day}日记录操作`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="cycle-sheet-handle" onClick={onClose} aria-label="关闭记录操作" />
        <header>
          <strong>5月{day}日</strong>
        </header>
        <div className="cycle-sheet-actions">
          {actions.map((action) => (
            <button type="button" key={action}>
              {action}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MomentAvatar({ className = "", image = "", name = "机", opacity = 1, role = "assistant" }) {
  const classes = ["moment-avatar", `is-${role}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-hidden="true">
      {image ? <img src={image} alt="" style={{ opacity }} /> : getMomentAvatarInitial(name, role === "assistant" ? "机" : "我")}
    </div>
  );
}

function TimelineDetail({ item, onBack, onToggleLike, onAddComment, onDeleteComment, onQuoteMoment, displayNames, avatarImages, avatarOpacities }) {
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTargetId, setReplyTargetId] = useState("");
  const [commentActionId, setCommentActionId] = useState("");
  const longPressTimerRef = useRef(null);
  const comments = item.comments || [];
  const articleAuthor = item.source === "user" ? "user" : "du";
  const articleName = getMomentAuthorName(articleAuthor, displayNames);
  const replyTarget = comments.find((comment) => comment.id === replyTargetId) || null;
  const replyTargetName = replyTarget ? getMomentAuthorName(replyTarget.author, displayNames) : "";

  useEffect(() => {
    setCommentDraft("");
    setReplyTargetId("");
    setCommentActionId("");
  }, [item.id]);

  useEffect(() => {
    if (replyTargetId && !replyTarget) {
      setReplyTargetId("");
    }
  }, [replyTargetId, replyTarget]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  function clearCommentPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openCommentActions(commentId) {
    clearCommentPress();
    setCommentActionId((current) => (current === commentId ? "" : commentId));
  }

  function startCommentPress(commentId) {
    clearCommentPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      setCommentActionId(commentId);
    }, 520);
  }

  function handleCommentKeyDown(event, commentId) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openCommentActions(commentId);
  }

  function handleReplyToComment(comment) {
    setReplyTargetId(comment.id);
    setCommentActionId("");
  }

  function handleDeleteComment(comment) {
    if (comment.author !== "user") {
      return;
    }

    onDeleteComment?.(item.id, comment.id);
    setCommentActionId("");
    if (replyTargetId === comment.id) {
      setReplyTargetId("");
    }
  }

  function handleSubmitComment(event) {
    event.preventDefault();
    const content = commentDraft.trim();

    if (!content) {
      return;
    }

    onAddComment?.(item.id, {
      id: `comment-local-${Date.now()}`,
      author: "user",
      content,
      createdAt: new Date().toISOString(),
      replyToCommentId: replyTarget?.id || null,
      replyToAuthor: replyTarget?.author || "",
    });
    setCommentDraft("");
    setReplyTargetId("");
  }

  return (
    <div className="function-detail-page moment-detail-page">
      <header className="moment-detail-header">
        <button type="button" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>
        <strong>MOMENT / 记录</strong>
      </header>
      <div className="moment-detail-body">
        <article className="moment-detail-article">
          <div className="moment-detail-author">
            <strong>{articleName}</strong>
            <span>{formatMomentDetailTime(item)}</span>
          </div>
          <p>{item.detailText || item.content}</p>
          <div className="moment-detail-photo" role="img" aria-label="阳光窗边的咖啡、花束和笔记本" />
        </article>
        <div className="moment-detail-actions">
          <button type="button" className={item.likedByUser ? "is-active" : ""} onClick={() => onToggleLike?.(item.id)}>
            <HeartIcon filled={item.likedByUser} />
            <span>{getMomentLikeCount(item)} LIKES</span>
          </button>
          <button type="button" onClick={() => onQuoteMoment?.(item)} aria-label="引用这条动态到聊天">
            <ShareIcon />
          </button>
        </div>
        <section className="moment-detail-comments">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const authorRole = getMomentAuthorRole(comment.author);
              const authorName = getMomentAuthorName(comment.author, displayNames);
              const replyLabel = getMomentCommentReplyLabel(comment, comments, displayNames);
              const canDelete = comment.author === "user";

              return (
                <article
                  className={`moment-detail-comment is-${authorRole}`}
                  key={comment.id}
                  tabIndex={0}
                  onKeyDown={(event) => handleCommentKeyDown(event, comment.id)}
                  onPointerCancel={clearCommentPress}
                  onPointerDown={() => startCommentPress(comment.id)}
                  onPointerLeave={clearCommentPress}
                  onPointerUp={clearCommentPress}
                >
                  <MomentAvatar
                    className="moment-comment-avatar"
                    image={avatarImages[authorRole]}
                    name={authorName}
                    opacity={avatarOpacities[authorRole]}
                    role={authorRole}
                  />
                  <div>
                    <div className="moment-comment-head">
                      <strong>{authorName}</strong>
                      {formatMomentCommentTime(comment.createdAt) && <time>{formatMomentCommentTime(comment.createdAt)}</time>}
                      <button type="button" className="moment-comment-more" onClick={() => openCommentActions(comment.id)} aria-label="评论操作">
                        ...
                      </button>
                    </div>
                    {replyLabel && <span className="moment-comment-reply-preview">回复 {replyLabel}</span>}
                    <p>{comment.content}</p>
                    {commentActionId === comment.id && (
                      <div className="moment-comment-actions" aria-label="评论操作">
                        <button type="button" onClick={() => handleReplyToComment(comment)}>
                          <ReplyIcon />
                          <span>回复</span>
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => handleDeleteComment(comment)}>
                            <TrashIcon />
                            <span>删除</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="moment-detail-empty">NO COMMENTS YET</div>
          )}
          <form className="moment-comment-form" onSubmit={handleSubmitComment}>
            {replyTarget && (
              <div className="moment-reply-target">
                <span>回复 {replyTargetName}：{truncateMomentComment(replyTarget.content, 18)}</span>
                <button type="button" onClick={() => setReplyTargetId("")} aria-label="取消回复">
                  ×
                </button>
              </div>
            )}
            <label>
              <CommentIcon />
              <input
                type="text"
                value={commentDraft}
                placeholder={replyTarget ? `回复 ${replyTargetName}` : "写一条评论"}
                onChange={(event) => setCommentDraft(event.target.value)}
              />
            </label>
            <button type="submit" disabled={!commentDraft.trim()}>
              发送
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function RatingStars({ value, onChange, label = "评分" }) {
  return (
    <div className="review-rating-stars" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const isActive = rating <= value;

        return (
          <button
            type="button"
            className={isActive ? "is-active" : ""}
            onClick={() => onChange?.(rating)}
            aria-label={`${rating} 星`}
            key={rating}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function ReviewVisualThumb({ review }) {
  const isBook = review.type === "book";
  const fallbackTitle = isBook ? "ONE HUNDRED YEARS OF SOLITUDE" : review.originalTitle || review.title || "FILM";

  return (
    <div className={`review-visual-thumb review-visual-${review.type}`} aria-hidden="true">
      {review.imageUrl ? (
        <img src={review.imageUrl} alt="" />
      ) : (
        <div className={`review-cover-placeholder ${isBook ? "review-book-cover-placeholder" : "review-screen-cover-placeholder"}`}>
          {isBook ? (
            <>
              <span>ONE HUNDRED</span>
              <span>YEARS OF</span>
              <span>SOLITUDE</span>
              <i aria-hidden="true" />
            </>
          ) : (
            <>
              <strong>{review.title || "影像"}</strong>
              <span>{fallbackTitle}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewStatusStamp({ review }) {
  return (
    <span className="review-status-stamp">
      {review.type === "book" ? (
        <>
          <span className="review-status-cn">已读</span>
          <span className="review-status-en">READ</span>
        </>
      ) : (
        "ADMIT ONE"
      )}
    </span>
  );
}

function ReviewLibraryCard({ review }) {
  return (
    <div className="review-card review-library-card library-card">
      <span className="review-paper-tape paper-tape" aria-hidden="true" />
      <span className="review-paper-pin paper-pin" aria-hidden="true" />
      <div className="review-card-head library-card-head">
        <ReviewVisualThumb review={review} />
        <div className="review-card-copy">
          <h2>{review.title}</h2>
          <p>{formatReviewCreator(review)}</p>
          <ReviewStatusStamp review={review} />
          <strong className="review-stars-text">{formatRatingStars(review.userRating)}</strong>
        </div>
      </div>
      <dl className="review-card-grid">
        <div>
          <dt>DATE</dt>
          <dd>{formatDottedDate(review.finishedAt)}</dd>
        </div>
        <div>
          <dt>PUBLISHER</dt>
          <dd>{review.publisher || "未记录"}</dd>
        </div>
        <div>
          <dt>DU</dt>
          <dd>{duReviewStatusLabels[review.duStatus]}</dd>
        </div>
      </dl>
    </div>
  );
}

function formatTicketSerial(review) {
  const [, month, day] = review.finishedAt?.split("-") || [];
  return month && day ? `${month}${day}` : review.externalId?.slice(-4).toUpperCase() || "0000";
}

function getTicketTag(review) {
  return review.externalId?.includes("mood") ? "THE-MOOD" : "SCREEN-NOTE";
}

function getTicketStubTitle(review) {
  if (review.externalId?.includes("mood")) {
    return "THE MOOD FOR LOVE";
  }

  return (review.originalTitle || review.title || "SCREEN NOTE").toUpperCase();
}

function ReviewTicketCard({ review }) {
  const serial = formatTicketSerial(review);
  const ticketTag = getTicketTag(review);
  const stubTitle = getTicketStubTitle(review);

  return (
    <div className="review-card review-ticket-card ticket-card">
      <span className="review-paper-tape ticket-tape paper-tape" aria-hidden="true" />
      <div className="review-ticket-main">
        <ReviewVisualThumb review={review} />
        <div className="review-ticket-copy">
          <h2>{review.title}</h2>
          <p>{formatReviewCreator(review)}</p>
          <small>{ticketTag}</small>
          <strong className="review-stars-text">{formatRatingStars(review.userRating)}</strong>
        </div>
        <dl className="review-ticket-meta-grid">
          <div>
            <dt>DATE</dt>
            <dd>{formatDottedDate(review.finishedAt)}</dd>
          </div>
          <div>
            <dt>YEAR</dt>
            <dd>{review.year || "未记录"}</dd>
          </div>
          <div>
            <dt>YOU</dt>
            <dd>{formatRatingStars(review.userRating)}</dd>
          </div>
          <div>
            <dt>DU</dt>
            <dd>{duReviewStatusLabels[review.duStatus]}</dd>
          </div>
        </dl>
      </div>
      <aside className="review-ticket-stub ticket-stub" aria-label="票根副券">
        <span>ADMIT<br />ONE</span>
        <div>
          <small>No.</small>
          <strong>{serial}</strong>
        </div>
        <em>{stubTitle}</em>
      </aside>
      </div>
  );
}

function ReviewArchiveCard({ review, onSelect }) {
  return (
    <button type="button" className={`review-archive-card review-archive-${review.type}`} onClick={() => onSelect(review.id)}>
      {review.type === "book" ? <ReviewLibraryCard review={review} /> : <ReviewTicketCard review={review} />}
    </button>
  );
}

function ReviewListPage({ activeFilter, reviewItems, sortMode, onBack, onFilterChange, onNew, onSelectReview, onSortChange }) {
  const visibleItems = reviewItems
    .filter((item) => activeFilter === "all" || item.type === activeFilter)
    .sort((a, b) => {
      if (sortMode === "finished") {
        return (b.finishedAt || "").localeCompare(a.finishedAt || "");
      }

      if (sortMode === "rating") {
        return (b.userRating || 0) - (a.userRating || 0);
      }

      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  const tabs = [
    { id: "all", label: "全部" },
    { id: "book", label: "书" },
    { id: "screen", label: "影" },
  ];
  const sortTabs = [
    { id: "created", label: "最近记录" },
    { id: "finished", label: "最近完成" },
    { id: "rating", label: "最近评分" },
  ];

  return (
    <>
      <header className="review-page-topbar book-film-header">
        <button type="button" onClick={onBack} aria-label="返回功能页">
          <BackIcon />
        </button>
        <div>
          <h1>书影札记</h1>
          <p>读过的、看过的，留在这里</p>
        </div>
        <span aria-hidden="true" />
      </header>
      <main className="review-page-body book-film-body">
        <nav className="review-tabs journal-tabs" aria-label="书影筛选">
          <div className="review-tabs-main journal-tabs-main">
            {tabs.map((tab) => (
              <button type="button" className={activeFilter === tab.id ? "is-active" : ""} onClick={() => onFilterChange(tab.id)} key={tab.id}>
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" className="review-tab-ticket-button" onClick={onNew}>
            记录一张
          </button>
        </nav>
        <nav className="review-sort-row journal-filter-chips" aria-label="书影排序">
          {sortTabs.map((tab) => (
            <button type="button" className={sortMode === tab.id ? "is-active" : ""} onClick={() => onSortChange(tab.id)} key={tab.id}>
              {tab.label}
            </button>
          ))}
        </nav>
        <section className="review-archive-list journal-card-stack" aria-label="书影记录">
          {visibleItems.length > 0 ? (
            visibleItems.map((review) => <ReviewArchiveCard review={review} onSelect={onSelectReview} key={review.id} />)
          ) : (
            <EmptyBlock title="还没有书影记录" body="点「记录」后，用 mock 搜索结果留下一张借书卡或票根。" />
          )}
        </section>
      </main>
    </>
  );
}

function ReviewSearchResult({ result, onSelect }) {
  return (
    <button type="button" className="review-search-result" onClick={() => onSelect(result)}>
      <ReviewVisualThumb review={{ ...result, screenKind: result.mediaType || "unknown" }} />
      <div>
        <strong>{result.title}</strong>
        <span>
          {result.type === "book" ? result.creator : `${result.creator} / ${result.year}`} · {getReviewSourceLabel(result.source)}
        </span>
        <p>{result.description}</p>
      </div>
    </button>
  );
}

function ReviewCreatePage({ initialReview = null, onBack, onSave }) {
  const isEditing = Boolean(initialReview);
  const initialResult = initialReview ? buildMetadataResultFromReview(initialReview) : null;
  const [selectedType, setSelectedType] = useState(initialReview?.type || "book");
  const [query, setQuery] = useState(initialReview?.title || "");
  const [selectedResult, setSelectedResult] = useState(initialResult);
  const [finishedAt, setFinishedAt] = useState(initialReview?.finishedAt || getTodayDateString());
  const [userRating, setUserRating] = useState(initialReview?.userRating || 0);
  const [userReview, setUserReview] = useState(initialReview?.userReview || "");
  const [userExcerpt, setUserExcerpt] = useState(initialReview?.userExcerpt || "");
  const visibleResults = mockMetadataSearchResults.filter((result) => {
    const matchesType = result.type === selectedType;
    const normalizedQuery = query.trim().toLowerCase();

    if (!matchesType) return false;
    if (!normalizedQuery) return false;

    return [result.title, result.originalTitle, result.creator, result.publisher, result.year]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery)) || mockMetadataSearchResults.filter((item) => item.type === selectedType).indexOf(result) < 2;
  });

  function handleTypeSelect(type) {
    setSelectedType(type);
    setSelectedResult(null);
    setQuery("");
    setUserRating(0);
    setUserReview("");
    setUserExcerpt("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedResult || userRating === 0) {
      return;
    }

    onSave(
      isEditing
        ? updateReviewFromDraft({
            review: initialReview,
            result: selectedResult,
            finishedAt,
            userRating,
            userReview: userReview.trim(),
            userExcerpt: userExcerpt.trim(),
          })
        : createReviewFromDraft({
            result: selectedResult,
            finishedAt,
            userRating,
            userReview: userReview.trim(),
            userExcerpt: userExcerpt.trim(),
          }),
    );
  }

  return (
    <>
      <header className="review-page-topbar">
        <button type="button" onClick={onBack} aria-label="返回书影列表">
          <BackIcon />
        </button>
        <div>
          <h1>{isEditing ? "编辑札记" : "记录一张"}</h1>
          <p>{isEditing ? "修改后会重新等待机的 mock 评分" : "先选作品，再补上你的星星"}</p>
        </div>
        <span aria-hidden="true" />
      </header>
      <main className="review-page-body review-create-body">
        <div className="review-type-switch" aria-label="选择记录类型">
          <button type="button" className={selectedType === "book" ? "is-active" : ""} onClick={() => handleTypeSelect("book")}>
            书
          </button>
          <button type="button" className={selectedType === "screen" ? "is-active" : ""} onClick={() => handleTypeSelect("screen")}>
            影
          </button>
        </div>

        <label className="review-search-box">
          <span>{selectedType === "book" ? "输入书名 / ISBN" : "输入电影、剧集或番剧名"}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selectedType === "book" ? "例如：向晚" : "例如：夜航"} />
        </label>

        {!selectedResult && (
          <section className="review-search-results" aria-label="mock 搜索结果">
            {visibleResults.length > 0 ? (
              visibleResults.map((result) => <ReviewSearchResult result={result} onSelect={setSelectedResult} key={result.externalId} />)
            ) : (
              <EmptyBlock title="等待搜索" body="输入关键词后会出现 mock 搜索结果。本轮不连接真实数据源。" />
            )}
          </section>
        )}

        {selectedResult && (
          <form className="review-edit-form" onSubmit={handleSubmit}>
            <section className="review-selected-work">
              <ReviewSearchResult result={selectedResult} onSelect={() => setSelectedResult(null)} />
              <dl>
                <div>
                  <dt>标题</dt>
                  <dd>{selectedResult.title}</dd>
                </div>
                <div>
                  <dt>{selectedType === "book" ? "作者" : "导演 / 主创"}</dt>
                  <dd>{selectedResult.creator}</dd>
                </div>
                <div>
                  <dt>{selectedType === "book" ? "出版社" : "年份"}</dt>
                  <dd>{selectedType === "book" ? selectedResult.publisher : selectedResult.year}</dd>
                </div>
              </dl>
            </section>
            <label className="review-form-field">
              <span>完成日期</span>
              <input type="date" value={finishedAt} onChange={(event) => setFinishedAt(event.target.value)} />
            </label>
            <div className="review-form-field">
              <span>你的评分</span>
              <RatingStars value={userRating} onChange={setUserRating} />
            </div>
            <label className="review-form-field">
              <span>{selectedType === "book" ? "短评 / 摘抄" : "短评"}</span>
              <textarea value={userReview} onChange={(event) => setUserReview(event.target.value)} placeholder="写一句就够。" />
            </label>
            {selectedType === "book" && (
              <label className="review-form-field">
                <span>摘抄</span>
                <textarea value={userExcerpt} onChange={(event) => setUserExcerpt(event.target.value)} placeholder="可选，本轮只保存在展开页。" />
              </label>
            )}
            <button type="submit" className="review-save-button" disabled={!selectedResult || userRating === 0}>
              {isEditing ? "保存修改" : "保存札记"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}

function ReviewExpandedCard({ review }) {
  return (
    <article className={`review-expanded-card review-expanded-${review.type}`}>
      <div className="review-expanded-cover">
        {review.type === "screen" && (
          <div className="review-ticket-rip review-expanded-rip">
            <span>ADMIT ONE</span>
          </div>
        )}
        <div className="review-expanded-main">
          {review.type === "book" && <span className="review-paper-tape" aria-hidden="true" />}
          <div className="review-expanded-heading">
            <ReviewVisualThumb review={review} />
            <div>
              <small>{review.type === "book" ? "LIBRARY CARD" : `SERIAL: ${review.externalId?.slice(-8).toUpperCase() || "MOCK-001"}`}</small>
              <h2>{review.title}</h2>
              <p>{formatReviewCreator(review)}</p>
              <strong>{formatRatingStars(review.userRating)}</strong>
            </div>
            <ReviewStatusStamp review={review} />
          </div>
          <dl className="review-expanded-meta">
            <div>
              <dt>DATE</dt>
              <dd>{formatDottedDate(review.finishedAt)}</dd>
            </div>
            <div>
              <dt>{review.type === "book" ? "PUBLISHER" : "YEAR"}</dt>
              <dd>{review.type === "book" ? review.publisher || "未记录" : review.year || "未记录"}</dd>
            </div>
            <div>
              <dt>DU</dt>
              <dd>{duReviewStatusLabels[review.duStatus]}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="review-expanded-note">
        <h3>你的短评</h3>
        <p>{review.userReview || "还没有写短评。"}</p>
      </section>
      {review.type === "book" && (
        <section className="review-expanded-note">
          <h3>摘抄</h3>
          <p>{review.userExcerpt || "还没有摘抄。"}</p>
        </section>
      )}
      <section className="review-expanded-note">
        <div className="review-note-heading">
          <h3>机的短评</h3>
          <strong>{formatDuReviewScore(review)}</strong>
        </div>
        <p>{review.duStatus === "generated" ? review.duReview : "机还没看过。"}</p>
      </section>
    </article>
  );
}

function getScreenKindLabel(screenKind) {
  if (screenKind === "tv") return "剧集";
  if (screenKind === "anime") return "番剧";
  return "电影";
}

function isScreenReview(review) {
  return review?.type === "screen" || review?.cardStyle === "ticketStub" || (review?.screenKind && review.screenKind !== "unknown");
}

function ScreenTicketDetail({ review }) {
  const serial = review.externalId?.slice(-8).toUpperCase() || "MOCK-001";
  const displayTitle = review.originalTitle || review.title;
  const hasOriginalTitle = Boolean(review.originalTitle);
  const screenKindLabel = getScreenKindLabel(review.screenKind);
  const runtime = review.screenKind === "tv" ? "6 EP" : review.screenKind === "anime" ? "12 EP" : "128 MIN";
  const ticketFields = [
    { label: "HALL", value: "3" },
    { label: "SEAT", value: "6-06" },
    { label: "PRICE", value: "19.9" },
  ];

  return (
    <article className="screen-ticket-detail" data-debug-view="screen-ticket-detail-v2">
      <div className="screen-ticket-topline">- {displayTitle} -</div>
      <div className="screen-ticket-hero" aria-hidden={!review.imageUrl}>
        {review.imageUrl ? (
          <img src={review.imageUrl} alt="" />
        ) : (
          <div className="screen-ticket-hero-fallback">
            <span>{screenKindLabel}</span>
            <strong>{review.year || "MOCK"}</strong>
          </div>
        )}
      </div>

      <section className="screen-ticket-title-block">
        <small>ADMIT ONE · SERIAL {serial}</small>
        <h2>{displayTitle}</h2>
        {hasOriginalTitle && <strong>{review.title}</strong>}
      </section>

      <section className="screen-ticket-meta" aria-label="作品信息">
        <p>[{screenKindLabel}] {formatReviewCreator(review)}</p>
        <p>
          {review.year || "YEAR N/A"} / {review.externalSource === "tmdb" ? "TMDb MOCK" : "MOCK ARCHIVE"} / {runtime}
        </p>
      </section>

      <section className="screen-ticket-rating-row" aria-label="评分">
        <div>
          <span>YOU</span>
          <strong>{formatRatingStars(review.userRating)}</strong>
        </div>
        <div>
          <span>DU</span>
          <strong>{review.duStatus === "generated" && review.duRating != null ? formatRatingStars(review.duRating) : duReviewStatusLabels[review.duStatus]}</strong>
        </div>
      </section>

      <dl className="screen-ticket-fields" aria-label="票据信息">
        {ticketFields.map((field) => (
          <div key={field.label}>
            <dt>{field.label} :</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="screen-ticket-stub-divider" aria-hidden="true" />
      <section className="screen-ticket-review-stub">
        <span className="screen-ticket-stub-label">REVIEW STUB</span>
        <article>
          <h3>你的短评</h3>
          <p>{review.userReview || "还没有写短评。"}</p>
        </article>
        <article>
          <div className="review-note-heading">
            <h3>机的短评</h3>
            <strong>{formatDuReviewScore(review)}</strong>
          </div>
          <p>{review.duStatus === "generated" ? review.duReview : "机还没看过。"}</p>
        </article>
        <span className="screen-ticket-bottom-perf" aria-hidden="true" />
      </section>
    </article>
  );
}

function ReviewDetailPage({ review, onBack, onDelete, onEdit }) {
  const isScreenDetail = isScreenReview(review);

  return (
    <>
      <header className="review-page-topbar review-detail-topbar review-slim-detail-topbar">
        <button type="button" onClick={onBack} aria-label="返回书影列表">
          <BackIcon />
        </button>
        <span aria-hidden="true" />
        <div className="review-detail-actions">
          <button type="button" onClick={() => onEdit?.(review.id)} aria-label="编辑该记录">
            <EditIcon />
          </button>
          <button type="button" className="review-delete-record-button" onClick={() => onDelete?.(review.id)} aria-label="删除该记录">
            <TrashIcon />
          </button>
        </div>
      </header>
      <main className={`review-page-body review-detail-body review-slim-detail-body${isScreenDetail ? " review-screen-detail-body" : ""}`}>
        {isScreenDetail ? <ScreenTicketDetail review={review} /> : <ReviewExpandedCard review={review} />}
      </main>
    </>
  );
}

function ReviewPanel({
  activeFilter,
  reviewItems,
  selectedReviewId,
  sortMode,
  onBack,
  onClearSelectedReview,
  onCreateReview,
  onDeleteReview,
  onFilterChange,
  onSortChange,
  onUpdateReview,
}) {
  const [view, setView] = useState(selectedReviewId ? "detail" : "list");
  const [localSelectedReviewId, setLocalSelectedReviewId] = useState(selectedReviewId || null);
  const activeReviewId = selectedReviewId || localSelectedReviewId;
  const selectedReview = activeReviewId ? reviewItems.find((review) => review.id === activeReviewId) : null;

  useEffect(() => {
    if (selectedReviewId) {
      setLocalSelectedReviewId(selectedReviewId);
      setView("detail");
    }
  }, [selectedReviewId]);

  function handleBackToList() {
    setView("list");
    setLocalSelectedReviewId(null);
    onClearSelectedReview?.();
  }

  function handleBackFromDetail() {
    if (selectedReviewId) {
      onBack?.();
      return;
    }

    handleBackToList();
  }

  function handleSelectReview(reviewId) {
    setLocalSelectedReviewId(reviewId);
    setView("detail");
  }

  function handleSaveReview(review) {
    onCreateReview(review);
    setView("list");
    setLocalSelectedReviewId(null);
  }

  function handleUpdateReview(review) {
    onUpdateReview?.(review);
    setView("detail");
    setLocalSelectedReviewId(review.id);
  }

  function handleDeleteReview(reviewId) {
    onDeleteReview?.(reviewId);
    setView("list");
    setLocalSelectedReviewId(null);
    onClearSelectedReview?.();
  }

  if (view === "create") {
    return <ReviewCreatePage onBack={() => setView("list")} onSave={handleSaveReview} />;
  }

  if (view === "edit" && selectedReview) {
    return <ReviewCreatePage initialReview={selectedReview} onBack={() => setView("detail")} onSave={handleUpdateReview} />;
  }

  if (view === "detail" && selectedReview) {
    return <ReviewDetailPage review={selectedReview} onBack={handleBackFromDetail} onDelete={handleDeleteReview} onEdit={() => setView("edit")} />;
  }

  if (view === "detail" && activeReviewId && !selectedReview) {
    return (
      <>
        <header className="review-page-topbar">
          <button type="button" onClick={handleBackFromDetail} aria-label={selectedReviewId ? "返回动态" : "返回书影列表"}>
            <BackIcon />
          </button>
          <div>
            <h1>书影札记</h1>
            <p>这条动态关联的记录已经不存在</p>
          </div>
          <span aria-hidden="true" />
        </header>
        <main className="review-page-body">
          <EmptyBlock title="札记暂时找不到" body="可能已经被删除。可以返回列表查看仍保留的书影记录。" />
        </main>
      </>
    );
  }

  return (
    <ReviewListPage
      activeFilter={activeFilter}
      reviewItems={reviewItems}
      sortMode={sortMode}
      onBack={onBack}
      onFilterChange={onFilterChange}
      onNew={() => setView("create")}
      onSelectReview={handleSelectReview}
      onSortChange={onSortChange}
    />
  );
}

function CycleFeaturePanel({ cycleProfile, onBack, onSaveCycle }) {
  const [showSettings, setShowSettings] = useState(false);
  const [ovulationPredictionEnabled, setOvulationPredictionEnabled] = useState(cycleProfile.ovulationPredictionEnabled !== false);
  const cycleDay = getCycleDay(cycleProfile);

  useEffect(() => {
    setOvulationPredictionEnabled(cycleProfile.ovulationPredictionEnabled !== false);
  }, [cycleProfile.ovulationPredictionEnabled]);

  function handleToggleOvulationPrediction() {
    const nextValue = !ovulationPredictionEnabled;
    setOvulationPredictionEnabled(nextValue);
    onSaveCycle({ ...cycleProfile, ovulationPredictionEnabled: nextValue });
  }

  return (
    <div className="function-detail-page cycle-detail-page">
      <header className="cycle-page-header">
        <button type="button" className="cycle-close-button" onClick={onBack} aria-label="返回功能页">
          ×
        </button>
        <div>
          <strong>{cycleDay ? `本周期第 ${cycleDay} 天` : "周期未设置"}</strong>
          <span>{formatChineseDate(getTodayDateString())}</span>
        </div>
        <button
          type="button"
          className={`cycle-settings-icon-button ${showSettings ? "is-active" : ""}`}
          onClick={() => setShowSettings((value) => !value)}
          aria-expanded={showSettings}
          aria-label={showSettings ? "隐藏周期设置" : "显示周期设置"}
        >
          <CycleSettingsIcon />
        </button>
      </header>
      <div className="cycle-detail-body">
        <CyclePanel
          cycleProfile={cycleProfile}
          showSettings={showSettings}
          ovulationPredictionEnabled={ovulationPredictionEnabled}
          onToggleOvulationPrediction={handleToggleOvulationPrediction}
          onSaveCycle={onSaveCycle}
        />
      </div>
    </div>
  );
}

function FeaturePanel({
  cycleProfile,
  id,
  initialSelectedDiaryId,
  initialSelectedReminderId,
  initialSelectedScheduleId,
  onAddTodo,
  onBack,
  onClearSelectedReminder,
  onClearSelectedSchedule,
  onSaveCycle,
  onSetReminderStatus,
  onSetScheduleStatus,
  onToggleSubtask,
  reminders,
  scheduleItems,
}) {
  if (id === "cycle") {
    return <CycleFeaturePanel cycleProfile={cycleProfile} onBack={onBack} onSaveCycle={onSaveCycle} />;
  }

  if (id === "schedule") {
    return (
      <SchedulePanel
        initialSelectedScheduleId={initialSelectedScheduleId}
        onAddTodo={onAddTodo}
        onBack={onBack}
        onClearSelectedSchedule={onClearSelectedSchedule}
        onSetStatus={onSetScheduleStatus}
        onToggleSubtask={onToggleSubtask}
        scheduleItems={scheduleItems}
      />
    );
  }

  if (id === "reminders") {
    return (
      <RemindersPanel
        initialSelectedReminderId={initialSelectedReminderId}
        onBack={onBack}
        onClearSelectedReminder={onClearSelectedReminder}
        onSetStatus={onSetReminderStatus}
        reminders={reminders}
      />
    );
  }

  if (id === "du-diary") {
    return <DiaryPanel initialSelectedEntryId={initialSelectedDiaryId} onBack={onBack} />;
  }

  return null;
}

export default function FunctionPage({ onDetailOverlayChange, onOpenChatWithQuote }) {
  const [functionPageState, setFunctionPageState] = useState(() => loadFunctionPageState());
  const [dynamics, setDynamics] = useState(() => syncDefaultMomentDetails(loadDynamics(defaultDynamics)));
  const [mailItems, setMailItems] = useState(() => loadMailbox(mockMailItems));
  const [reminders, setReminders] = useState(() => loadReminders(defaultReminderItems));
  const [scheduleItems, setScheduleItems] = useState(() => loadSchedule(mockSchedules));
  const [cycleProfile, setCycleProfile] = useState(() => loadCycleProfile(mockCycleProfile));
  const [reviewItems, setReviewItems] = useState(() => loadReviews(mockReviewItems));
  const [activeFeatureId, setActiveFeatureId] = useState("moments");
  const [activePanelId, setActivePanelId] = useState(null);
  const [returnPanelId, setReturnPanelId] = useState(null);
  const [dynamicHistoryState, setDynamicHistoryState] = useState({ selectedDateKey: "" });
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState(null);
  const [selectedDiaryFromTimelineId, setSelectedDiaryFromTimelineId] = useState(null);
  const [selectedReminderFromTimelineId, setSelectedReminderFromTimelineId] = useState(null);
  const [selectedReviewFromTimelineId, setSelectedReviewFromTimelineId] = useState(null);
  const [selectedScheduleFromTimelineId, setSelectedScheduleFromTimelineId] = useState(null);
  const [selectedMailFromSearchId, setSelectedMailFromSearchId] = useState(null);
  const [mailboxDetailOpen, setMailboxDetailOpen] = useState(false);
  const [mailboxInitialKind, setMailboxInitialKind] = useState("all");
  const [layoutSettingsOpen, setLayoutSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPermissionToast, setShowPermissionToast] = useState(true);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const [uiSettings, setUiSettings] = useState(() => getSettings().ui);
  const duReviewTimersRef = useRef({});
  const momentReplyTimersRef = useRef({});
  const favoriteMailIds = functionPageState.favoriteMailIds || [];
  const reviewFilter = functionPageState.reviewFilter || "all";
  const reviewSortMode = functionPageState.reviewSortMode || "created";
  const timelineItems = diaryTimelineItem ? [...dynamics, diaryTimelineItem] : dynamics;
  const selectedTimelineItem = selectedTimelineItemId
    ? timelineItems.find((item) => item.id === selectedTimelineItemId)
    : null;
  const selectedTimelineMail = ["letter", "postcard"].includes(selectedTimelineItem?.type)
    ? getMailForTimelineItem(selectedTimelineItem, mailItems)
    : null;
  const baseFeatureItems = buildEntryFeatures({ dynamics, mailItems, reminders, scheduleItems, reviewItems });
  const baseFunctionChips = buildFunctionChips(cycleProfile, reminders);
  const functionLayout = normalizeFunctionLayout(functionPageState.functionLayout);
  const functionModules = getOrderedFunctionModules(
    buildFunctionModules({ featureItems: baseFeatureItems, functionChips: baseFunctionChips }),
    functionLayout.moduleOrder,
  );
  const { featureItems, functionChips } = getFunctionLayoutItems(functionModules, functionLayout.mode);
  const topNotices = buildTopNotices({ dynamics, mailItems, reminders, scheduleItems, cycleProfile, reviewItems });
  const topNotice = topNotices[noticeIndex % topNotices.length];
  const displayNames = getFunctionDisplayNames(uiSettings);
  const { images: avatarImages, opacities: avatarOpacities } = getFunctionAvatarSettings(uiSettings);
  const timelineMailDetailOpen = ["letter", "postcard"].includes(selectedTimelineItem?.type);
  const shouldHideBottomNav =
    layoutSettingsOpen ||
    timelineMailDetailOpen ||
    mailboxDetailOpen ||
    activePanelId === "mailbox" ||
    activePanelId === "moments" ||
    activePanelId === "reviews" ||
    activePanelId === "schedule" ||
    activePanelId === "reminders" ||
    activePanelId === "cycle" ||
    activePanelId === "du-diary";
  const visibleTimelineItems = timelineItems.filter((item) => item.showInTimeline);
  const functionSearchResults = buildFunctionSearchResults({
    timelineItems: visibleTimelineItems,
    mailItems,
    reviewItems,
    diaryEntries: mockDiaryEntries,
    reminders,
    scheduleItems,
  });
  const visibleFunctionSearchResults = filterFunctionSearchResults(functionSearchResults, searchQuery);

  useEffect(() => {
    saveFunctionPageState(functionPageState);
  }, [functionPageState]);

  useEffect(() => {
    saveDynamics(dynamics);
  }, [dynamics]);

  useEffect(() => {
    saveMailbox(mailItems);
  }, [mailItems]);

  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  useEffect(() => {
    saveSchedule(scheduleItems);
  }, [scheduleItems]);

  useEffect(() => {
    saveCycleProfile(cycleProfile);
  }, [cycleProfile]);

  useEffect(() => {
    saveReviews(reviewItems);
  }, [reviewItems]);

  useEffect(() => {
    const syncUiSettings = () => setUiSettings(getSettings().ui);
    window.addEventListener("dukou:settings-changed", syncUiSettings);
    return () => window.removeEventListener("dukou:settings-changed", syncUiSettings);
  }, []);

  useEffect(() => {
    setScheduleItems((items) => {
      const nextItems = items.map((item) => (shouldMarkScheduleExpired(item) ? { ...item, status: "expired" } : item));
      return nextItems.some((item, index) => item.status !== items[index].status) ? nextItems : items;
    });
  }, []);

  useEffect(() => {
    reviewItems.forEach((review) => {
      if (review.duStatus !== "pending" || !review.duRequestedAt || duReviewTimersRef.current[review.id]) {
        return;
      }

      duReviewTimersRef.current[review.id] = window.setTimeout(() => {
        const generatedReview = {
          ...review,
          ...buildMockDuReview(review),
        };

        setReviewItems((items) =>
          items.map((item) => (item.id === review.id && item.duStatus === "pending" ? generatedReview : item)),
        );
        setDynamics((items) => insertDuReviewDynamic(items, generatedReview));
        delete duReviewTimersRef.current[review.id];
      }, 3200);
    });

    Object.keys(duReviewTimersRef.current).forEach((reviewId) => {
      const review = reviewItems.find((item) => item.id === reviewId);

      if (!review || review.duStatus !== "pending" || !review.duRequestedAt) {
        window.clearTimeout(duReviewTimersRef.current[reviewId]);
        delete duReviewTimersRef.current[reviewId];
      }
    });
  }, [reviewItems]);

  useEffect(() => {
    return () => {
      Object.values(duReviewTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      duReviewTimersRef.current = {};
      Object.values(momentReplyTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      momentReplyTimersRef.current = {};
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowPermissionToast(false), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNoticeIndex((value) => (value + 1) % topNotices.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [topNotices.length]);

  useEffect(() => {
    onDetailOverlayChange?.(shouldHideBottomNav);
    return () => onDetailOverlayChange?.(false);
  }, [onDetailOverlayChange, shouldHideBottomNav]);

  useEffect(() => {
    if (activePanelId !== "mailbox") {
      setMailboxDetailOpen(false);
    }
  }, [activePanelId]);

  function handleFeatureSelect(id) {
    setActiveFeatureId(id);
    setSelectedTimelineItemId(null);
    setSelectedDiaryFromTimelineId(null);
    setSelectedReminderFromTimelineId(null);
    setSelectedReviewFromTimelineId(null);
    setSelectedScheduleFromTimelineId(null);
    setReturnPanelId(null);
    setSelectedMailFromSearchId(null);

    if (id === "moments") {
      setActivePanelId("moments");
      return;
    }

    if (id === "mailbox") {
      setMailboxInitialKind("all");
    }

    setActivePanelId(id);
  }

  function handleChipSelect(id) {
    setActiveFeatureId(id);
    setSelectedTimelineItemId(null);
    setSelectedDiaryFromTimelineId(null);
    setSelectedReminderFromTimelineId(null);
    setSelectedReviewFromTimelineId(null);
    setSelectedScheduleFromTimelineId(null);
    setReturnPanelId(null);
    setSelectedMailFromSearchId(null);
    setActivePanelId(id);
  }

  function handleClosePanel() {
    if (returnPanelId === "moments") {
      setActiveFeatureId("moments");
      setActivePanelId("moments");
      setReturnPanelId(null);
      setSelectedTimelineItemId(null);
      setSelectedDiaryFromTimelineId(null);
      setSelectedReminderFromTimelineId(null);
      setSelectedReviewFromTimelineId(null);
      setSelectedScheduleFromTimelineId(null);
      setSelectedMailFromSearchId(null);
      return;
    }

    setActivePanelId(null);
    setReturnPanelId(null);
    setSelectedTimelineItemId(null);
    setSelectedDiaryFromTimelineId(null);
    setSelectedReminderFromTimelineId(null);
    setSelectedReviewFromTimelineId(null);
    setSelectedScheduleFromTimelineId(null);
    setSelectedMailFromSearchId(null);
  }

  function markDynamicRead(itemId) {
    setDynamics((items) => items.map((item) => (item.id === itemId ? { ...item, isUnread: false } : item)));
  }

  function clearMomentReplyTimer(timerKey) {
    if (!momentReplyTimersRef.current[timerKey]) {
      return;
    }

    window.clearTimeout(momentReplyTimersRef.current[timerKey]);
    delete momentReplyTimersRef.current[timerKey];
  }

  function queueDuMomentReply(itemId, sourceComment) {
    if (typeof window === "undefined") {
      return;
    }

    const timerKey = `${itemId}:${sourceComment.id}`;
    clearMomentReplyTimer(timerKey);
    const delay = /[机吗？?]/.test(sourceComment.content) ? 0 : 700 + Math.round(Math.random() * 900);

    momentReplyTimersRef.current[timerKey] = window.setTimeout(() => {
      setDynamics((items) =>
        items.map((item) => {
          if (item.id !== itemId || item.type !== "moment") return item;

          const comments = item.comments || [];
          const hasSourceComment = comments.some((entry) => entry.id === sourceComment.id);
          const hasDuReply = comments.some(
            (entry) => entry.author === "du" && entry.replyToCommentId === sourceComment.id,
          );

          if (!hasSourceComment || hasDuReply) {
            return item;
          }

          const likedByDu = true;
          return {
            ...item,
            likedByDu,
            likeCount: Number(Boolean(item.likedByUser)) + Number(likedByDu),
            comments: [...comments, buildDuMomentReply(item, sourceComment)],
          };
        }),
      );
      delete momentReplyTimersRef.current[timerKey];
    }, delay);
  }

  function handleToggleTimelineLike(itemId) {
    setDynamics((items) =>
      items.map((item) => {
        if (item.id !== itemId) return item;

        const likedByUser = !item.likedByUser;
        const likedByDu = getMomentLikedByDu(item);
        const likeCount = Number(likedByUser) + Number(likedByDu);
        return { ...item, likedByUser, likedByDu, likeCount };
      }),
    );
  }

  function handleAddTimelineComment(itemId, comment) {
    const currentItem = timelineItems.find((item) => item.id === itemId);
    const nextItem = currentItem ? { ...currentItem, comments: [...(currentItem.comments || []), comment] } : null;

    setDynamics((items) =>
      items.map((item) => (item.id === itemId ? { ...item, comments: [...(item.comments || []), comment] } : item)),
    );

    if (comment.author === "user" && nextItem?.type === "moment" && shouldQueueDuMomentReply(nextItem, comment)) {
      queueDuMomentReply(itemId, comment);
    }
  }

  function handleDeleteTimelineComment(itemId, commentId) {
    clearMomentReplyTimer(`${itemId}:${commentId}`);
    setDynamics((items) =>
      items.map((item) => {
        if (item.id !== itemId || item.type !== "moment") return item;

        return {
          ...item,
          comments: (item.comments || []).filter(
            (comment) => comment.id !== commentId && comment.replyToCommentId !== commentId,
          ),
        };
      }),
    );
  }

  function handleMarkMailRead(mailId) {
    setMailItems((items) => items.map((mail) => (mail.id === mailId ? { ...mail, readStatus: "read" } : mail)));
  }

  function handleSaveMailDraft(draft, deliveryStatus = "draft", useExistingDraft = true) {
    const draftKind = getMailKind(draft);
    const existingDraft = useExistingDraft ? findLocalDraftByKind(mailItems, draftKind) : null;
    const nextMail = buildMailDraft({ existingDraft, ...draft, deliveryStatus });

    setMailItems((items) => {
      if (existingDraft) {
        return items.map((mail) => (mail.id === existingDraft.id ? nextMail : mail));
      }

      return [nextMail, ...items];
    });

    if (deliveryStatus === "sent") {
      setDynamics((items) => upsertMailDynamic(items, nextMail));
    }
  }

  function handleUpdateMail(mailId, draft) {
    const currentMail = mailItems.find((mail) => mail.id === mailId);

    if (!currentMail || currentMail.from !== "user" || currentMail.deliveryStatus !== "sent") {
      return;
    }

    const nextMail = {
      ...buildMailDraft({
        existingDraft: currentMail,
        ...draft,
        kind: getMailKind(currentMail),
        deliveryStatus: "sent",
      }),
      dateLabel: currentMail.dateLabel || "刚刚发送",
      writtenAtLabel: "刚刚修改",
    };

    setMailItems((items) => items.map((mail) => (mail.id === mailId ? nextMail : mail)));
    setDynamics((items) => upsertMailDynamic(items, nextMail));
  }

  function handleDeleteMail(mailId) {
    setMailItems((items) => items.filter((mail) => mail.id !== mailId));
    setDynamics((items) => items.filter((item) => item.mailId !== mailId && item.id !== `mail-dynamic-${mailId}`));
    setFunctionPageState((current) => ({
      ...current,
      favoriteMailIds: (current.favoriteMailIds || []).filter((id) => id !== mailId),
    }));
  }

  function handleQuoteMail(mail) {
    onOpenChatWithQuote?.(buildMailQuote(mail));
  }

  function handleQuoteMoment(item) {
    onOpenChatWithQuote?.(buildMomentQuote(item, displayNames));
  }

  function handleReminderStatus(reminderId, status) {
    setReminders((items) => items.map((item) => (item.id === reminderId ? { ...item, status } : item)));
  }

  function handleScheduleStatus(scheduleId, status) {
    setScheduleItems((items) => items.map((item) => (item.id === scheduleId ? { ...item, status } : item)));
  }

  function handleToggleSubtask(scheduleId, subtaskId) {
    setScheduleItems((items) =>
      items.map((item) =>
        item.id === scheduleId
          ? {
              ...item,
              subtasks: item.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask,
              ),
            }
          : item,
      ),
    );
  }

  function handleAddTodo(title) {
    const now = new Date();
    const startsAt = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newItem = {
      id: `schedule-local-${Date.now()}`,
      title,
      startsAt,
      endsAt: "",
      type: "todo",
      status: "pending",
      note: "本地新增的轻量待办。",
      subtasks: [],
    };

    setScheduleItems((items) => [newItem, ...items]);
  }

  function handleSaveCycle(value) {
    setCycleProfile((current) =>
      calculateCycleProfile({
        ...current,
        ...value,
      }),
    );
  }

  function clearDuReviewTimer(reviewId) {
    if (!duReviewTimersRef.current[reviewId]) {
      return;
    }

    window.clearTimeout(duReviewTimersRef.current[reviewId]);
    delete duReviewTimersRef.current[reviewId];
  }

  function handleReviewFilterChange(reviewFilterValue) {
    setFunctionPageState((current) => ({
      ...current,
      reviewFilter: reviewFilterValue,
    }));
  }

  function handleReviewSortChange(reviewSortModeValue) {
    setFunctionPageState((current) => ({
      ...current,
      reviewSortMode: reviewSortModeValue,
    }));
  }

  function handleCreateReview(review) {
    setReviewItems((items) => [review, ...items]);
    setDynamics((items) => upsertUserReviewDynamic(items, review));
  }

  function handleUpdateReview(review) {
    clearDuReviewTimer(review.id);
    setReviewItems((items) => items.map((item) => (item.id === review.id ? review : item)));
    setDynamics((items) =>
      upsertUserReviewDynamic(items, review).filter(
        (item) => item.relatedReviewId !== review.id || item.subtype !== "reviewRatedByDu",
      ),
    );
  }

  function handleDeleteReview(reviewId) {
    clearDuReviewTimer(reviewId);
    setReviewItems((items) => items.filter((item) => item.id !== reviewId));
    setDynamics((items) => items.filter((item) => item.relatedReviewId !== reviewId));
  }

  function handleTimelineSelect(item) {
    const shouldReturnToDynamicHistory = activePanelId === "moments";
    setSelectedDiaryFromTimelineId(null);
    setSelectedMailFromSearchId(null);

    if (item.type === "letter") {
      setSelectedReminderFromTimelineId(null);
      setSelectedReviewFromTimelineId(null);
      setSelectedScheduleFromTimelineId(null);
      setSelectedTimelineItemId(item.id);
      markDynamicRead(item.id);
      const mail = getMailForTimelineItem(item, mailItems);
      if (mail) {
        handleMarkMailRead(mail.id);
      }
      return;
    }

    if (item.type === "review") {
      markDynamicRead(item.id);
      setSelectedTimelineItemId(null);
      setSelectedReminderFromTimelineId(null);
      setSelectedReviewFromTimelineId(item.relatedReviewId || null);
      setSelectedScheduleFromTimelineId(null);
      setReturnPanelId(shouldReturnToDynamicHistory ? "moments" : null);
      setActiveFeatureId("reviews");
      setActivePanelId("reviews");
      return;
    }

    if (item.type === "reminder") {
      const reminder = getReminderForTimelineItem(item, reminders);
      markDynamicRead(item.id);
      setSelectedTimelineItemId(null);
      setSelectedReminderFromTimelineId(reminder?.id || null);
      setSelectedReviewFromTimelineId(null);
      setSelectedScheduleFromTimelineId(null);
      setReturnPanelId(shouldReturnToDynamicHistory ? "moments" : null);
      setActiveFeatureId("reminders");
      setActivePanelId("reminders");
      return;
    }

    if (item.type === "schedule") {
      const schedule = getScheduleForTimelineItem(item, scheduleItems);
      markDynamicRead(item.id);
      setSelectedTimelineItemId(null);
      setSelectedReminderFromTimelineId(null);
      setSelectedReviewFromTimelineId(null);
      setSelectedScheduleFromTimelineId(schedule?.id || null);
      setReturnPanelId(shouldReturnToDynamicHistory ? "moments" : null);
      setActiveFeatureId("schedule");
      setActivePanelId("schedule");
      return;
    }

    if (item.type === "diary") {
      markDynamicRead(item.id);
      setSelectedTimelineItemId(null);
      setSelectedDiaryFromTimelineId(mockDiaryEntries[0]?.id || null);
      setSelectedReminderFromTimelineId(null);
      setSelectedReviewFromTimelineId(null);
      setSelectedScheduleFromTimelineId(null);
      setReturnPanelId(shouldReturnToDynamicHistory ? "moments" : null);
      setActiveFeatureId("du-diary");
      setActivePanelId("du-diary");
      return;
    }

    if (!["moment", "postcard"].includes(item.type)) {
      return;
    }

    setSelectedReminderFromTimelineId(null);
    setSelectedReviewFromTimelineId(null);
    setSelectedScheduleFromTimelineId(null);
    setSelectedTimelineItemId(item.id);
    if (item.isUnread) {
      markDynamicRead(item.id);
    }
    if (item.type === "postcard") {
      const mail = getMailForTimelineItem(item, mailItems);
      if (mail) {
        handleMarkMailRead(mail.id);
      }
    }
  }

  function handleMailFavorite(mailId) {
    setFunctionPageState((current) => {
      const ids = current.favoriteMailIds || [];
      return {
        ...current,
        favoriteMailIds: ids.includes(mailId) ? ids.filter((id) => id !== mailId) : [...ids, mailId],
      };
    });
  }

  function handleTimelineMailFavorite(mailId) {
    handleMailFavorite(mailId);
  }

  function closeFunctionSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  function clearLinkedSelections() {
    setSelectedTimelineItemId(null);
    setSelectedDiaryFromTimelineId(null);
    setSelectedReminderFromTimelineId(null);
    setSelectedReviewFromTimelineId(null);
    setSelectedScheduleFromTimelineId(null);
    setSelectedMailFromSearchId(null);
    setReturnPanelId(null);
  }

  function handleSearchResultSelect(result) {
    closeFunctionSearch();

    if (result.kind === "dynamic") {
      const item = timelineItems.find((timelineItem) => timelineItem.id === result.targetId);
      if (item) {
        handleTimelineSelect(item);
      }
      return;
    }

    clearLinkedSelections();

    if (result.kind === "mail") {
      const mail = mailItems.find((item) => item.id === result.targetId);
      setSelectedMailFromSearchId(result.targetId);
      setMailboxInitialKind(getMailKind(mail || { kind: "letter" }) === "postcard" ? "postcard" : "all");
      setActiveFeatureId("mailbox");
      setActivePanelId("mailbox");
      return;
    }

    if (result.kind === "review") {
      setSelectedReviewFromTimelineId(result.targetId);
      setActiveFeatureId("reviews");
      setActivePanelId("reviews");
      return;
    }

    if (result.kind === "diary") {
      setSelectedDiaryFromTimelineId(result.targetId);
      setActiveFeatureId("du-diary");
      setActivePanelId("du-diary");
      return;
    }

    if (result.kind === "reminder") {
      setSelectedReminderFromTimelineId(result.targetId);
      setActiveFeatureId("reminders");
      setActivePanelId("reminders");
      return;
    }

    if (result.kind === "schedule") {
      setSelectedScheduleFromTimelineId(result.targetId);
      setActiveFeatureId("schedule");
      setActivePanelId("schedule");
    }
  }

  function handleSetFunctionLayoutMode(mode) {
    setFunctionPageState((current) => ({
      ...current,
      functionLayout: {
        ...normalizeFunctionLayout(current.functionLayout),
        mode,
      },
    }));
  }

  function handleMoveFunctionModule(moduleId, direction) {
    setFunctionPageState((current) => {
      const currentLayout = normalizeFunctionLayout(current.functionLayout);
      const currentIndex = currentLayout.moduleOrder.indexOf(moduleId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentLayout.moduleOrder.length) {
        return current;
      }

      const moduleOrder = [...currentLayout.moduleOrder];
      const [target] = moduleOrder.splice(currentIndex, 1);
      moduleOrder.splice(nextIndex, 0, target);

      return {
        ...current,
        functionLayout: {
          ...currentLayout,
          moduleOrder,
        },
      };
    });
  }

  function handleResetFunctionLayout() {
    setFunctionPageState((current) => ({
      ...current,
      functionLayout: DEFAULT_FUNCTION_LAYOUT,
    }));
  }

  return (
    <section className="function-root">
      {showPermissionToast && <div className="function-permission-toast">通知没开，提醒暂时只能在 App 里显示。</div>}
      <header className="function-topbar">
        <button
          type="button"
          className="function-topbar-button"
          onClick={() => {
            setSearchOpen(false);
            setLayoutSettingsOpen(true);
          }}
          aria-label="打开功能页设置"
          aria-expanded={layoutSettingsOpen}
        >
          <MenuIcon />
        </button>
        <div className="function-topbar-title">
          <small>DUKOU</small>
          <strong>FUNCTION</strong>
        </div>
        <button type="button" className="function-topbar-button" onClick={() => setSearchOpen(true)} aria-label="搜索功能">
          <SearchIcon />
        </button>
      </header>

      {searchOpen && (
        <FunctionSearchOverlay
          query={searchQuery}
          results={visibleFunctionSearchResults}
          onClose={closeFunctionSearch}
          onQueryChange={setSearchQuery}
          onSelectResult={handleSearchResultSelect}
        />
      )}
      {layoutSettingsOpen && (
        <FunctionLayoutSettings
          layout={functionLayout}
          modules={functionModules}
          onClose={() => setLayoutSettingsOpen(false)}
          onMoveModule={handleMoveFunctionModule}
          onReset={handleResetFunctionLayout}
          onSetMode={handleSetFunctionLayoutMode}
        />
      )}

      <div className="function-scroll">
        <TimeHero notice={topNotice} />
        {featureItems.length > 0 && <FeatureGrid features={featureItems} activeId={activeFeatureId} onSelect={handleFeatureSelect} />}
        {functionChips.length > 0 && <FunctionChips chips={functionChips} activeId={activeFeatureId} onSelect={handleChipSelect} />}
        <div>
          <DynamicTimeline
            items={visibleTimelineItems}
            onSelectItem={handleTimelineSelect}
            postcardImage={postcardSceneImage}
          />
        </div>
      </div>

      {activePanelId === "moments" && (
        <DynamicHistoryPanel
          items={visibleTimelineItems}
          initialSelectedDateKey={dynamicHistoryState.selectedDateKey}
          onBack={handleClosePanel}
          onSelectItem={handleTimelineSelect}
          onStateChange={setDynamicHistoryState}
          postcardImage={postcardSceneImage}
        />
      )}
      {activePanelId === "mailbox" && (
        <MailboxPage
          favoriteMailIds={favoriteMailIds}
          initialKind={mailboxInitialKind}
          initialSelectedMailId={selectedMailFromSearchId}
          mailItems={mailItems}
          postcardTemplates={postcardTemplates}
          onBack={handleClosePanel}
          onClearInitialSelectedMail={() => setSelectedMailFromSearchId(null)}
          onDetailChange={setMailboxDetailOpen}
          onDeleteMail={handleDeleteMail}
          onFavorite={handleMailFavorite}
          onMarkMailRead={handleMarkMailRead}
          onQuoteMail={handleQuoteMail}
          onSaveDraft={(draft) => handleSaveMailDraft(draft, "draft")}
          onSendDraft={(draft, useExistingDraft) => handleSaveMailDraft(draft, "sent", useExistingDraft)}
          onUpdateMail={handleUpdateMail}
        />
      )}
      {activePanelId === "reviews" && (
        <div className="function-detail-page review-page book-film-page">
          <ReviewPanel
            activeFilter={reviewFilter}
            reviewItems={reviewItems}
            selectedReviewId={selectedReviewFromTimelineId}
            sortMode={reviewSortMode}
            onBack={handleClosePanel}
            onClearSelectedReview={() => setSelectedReviewFromTimelineId(null)}
            onCreateReview={handleCreateReview}
            onDeleteReview={handleDeleteReview}
            onFilterChange={handleReviewFilterChange}
            onSortChange={handleReviewSortChange}
            onUpdateReview={handleUpdateReview}
          />
        </div>
      )}
      {activePanelId && activePanelId !== "moments" && activePanelId !== "mailbox" && activePanelId !== "reviews" && (
        <FeaturePanel
          cycleProfile={cycleProfile}
          id={activePanelId}
          initialSelectedDiaryId={selectedDiaryFromTimelineId}
          initialSelectedReminderId={selectedReminderFromTimelineId}
          initialSelectedScheduleId={selectedScheduleFromTimelineId}
          onAddTodo={handleAddTodo}
          reminders={reminders}
          scheduleItems={scheduleItems}
          onBack={handleClosePanel}
          onClearSelectedReminder={() => setSelectedReminderFromTimelineId(null)}
          onClearSelectedSchedule={() => setSelectedScheduleFromTimelineId(null)}
          onSaveCycle={handleSaveCycle}
          onSetReminderStatus={handleReminderStatus}
          onSetScheduleStatus={handleScheduleStatus}
          onToggleSubtask={handleToggleSubtask}
        />
      )}
      {selectedTimelineItem?.type === "moment" && (
        <TimelineDetail
          item={selectedTimelineItem}
          onBack={() => setSelectedTimelineItemId(null)}
          onToggleLike={handleToggleTimelineLike}
          onAddComment={handleAddTimelineComment}
          onDeleteComment={handleDeleteTimelineComment}
          onQuoteMoment={handleQuoteMoment}
          displayNames={displayNames}
          avatarImages={avatarImages}
          avatarOpacities={avatarOpacities}
        />
      )}
      {selectedTimelineItem?.type === "letter" && selectedTimelineMail && (
        <LetterDetailPage
          mail={selectedTimelineMail}
          isFavorite={favoriteMailIds.includes(selectedTimelineMail.id)}
          onBack={() => setSelectedTimelineItemId(null)}
          onFavorite={handleTimelineMailFavorite}
          onQuoteMail={handleQuoteMail}
        />
      )}
      {selectedTimelineItem?.type === "letter" && !selectedTimelineMail && (
        <MissingLinkedDetail
          eyebrow="MAIL MISSING"
          title="这封信暂时找不到"
          body="这条动态关联的信件已经不在本地信箱里。"
          onBack={() => setSelectedTimelineItemId(null)}
        />
      )}
      {selectedTimelineItem?.type === "postcard" && selectedTimelineMail && (
        <PostcardDetailPage
          mail={selectedTimelineMail}
          isFavorite={favoriteMailIds.includes(selectedTimelineMail.id)}
          onBack={() => setSelectedTimelineItemId(null)}
          onFavorite={handleTimelineMailFavorite}
          onQuoteMail={handleQuoteMail}
        />
      )}
      {selectedTimelineItem?.type === "postcard" && !selectedTimelineMail && (
        <MissingLinkedDetail
          eyebrow="POSTCARD MISSING"
          title="这张明信片暂时找不到"
          body="这条动态关联的明信片已经不在本地信箱里。"
          onBack={() => setSelectedTimelineItemId(null)}
        />
      )}
    </section>
  );
}
