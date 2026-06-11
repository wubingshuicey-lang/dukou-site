import { useState, useEffect, useRef, useCallback } from "react";
import { getModelSettings } from "../../store/settings.js";
import { callOpenAICompatible } from "../../api/providers/openaiCompatible.js";

// ─── 数据 ────────────────────────────────────────────────────────────────────
const MAJOR_ARCANA = [
  { id: 0,  name: "愚者",    en: "The Fool",          meaning: "新的开始、冒险、天真、自由" },
  { id: 1,  name: "魔术师",  en: "The Magician",      meaning: "创造力、技巧、意志力、显化" },
  { id: 2,  name: "女祭司",  en: "The High Priestess",meaning: "直觉、潜意识、神秘、内在智慧" },
  { id: 3,  name: "皇后",    en: "The Empress",       meaning: "丰饶、母性、自然、感官享受" },
  { id: 4,  name: "皇帝",    en: "The Emperor",       meaning: "权威、结构、稳定、父亲形象" },
  { id: 5,  name: "教皇",    en: "The Hierophant",    meaning: "传统、信仰、教育、精神指引" },
  { id: 6,  name: "恋人",    en: "The Lovers",        meaning: "爱情、选择、和谐、关系" },
  { id: 7,  name: "战车",    en: "The Chariot",       meaning: "意志力、胜利、决心、前进" },
  { id: 8,  name: "力量",    en: "Strength",          meaning: "勇气、耐心、内在力量、柔和" },
  { id: 9,  name: "隐者",    en: "The Hermit",        meaning: "内省、孤独、寻求真理、指引" },
  { id: 10, name: "命运之轮",en: "Wheel of Fortune",  meaning: "命运、转折、循环、机遇" },
  { id: 11, name: "正义",    en: "Justice",           meaning: "公正、真理、因果、法律" },
  { id: 12, name: "倒吊人",  en: "The Hanged Man",    meaning: "牺牲、换个角度看世界、停滞" },
  { id: 13, name: "死神",    en: "Death",             meaning: "结束、转变、重生、放下" },
  { id: 14, name: "节制",    en: "Temperance",        meaning: "平衡、调和、耐心、中庸" },
  { id: 15, name: "恶魔",    en: "The Devil",         meaning: "束缚、欲望、物质主义、阴影" },
  { id: 16, name: "高塔",    en: "The Tower",         meaning: "突变、崩塌、启示、打破幻象" },
  { id: 17, name: "星星",    en: "The Star",          meaning: "希望、信念、疗愈、灵感" },
  { id: 18, name: "月亮",    en: "The Moon",          meaning: "幻觉、恐惧、潜意识、梦境" },
  { id: 19, name: "太阳",    en: "The Sun",           meaning: "快乐、成功、活力、真相" },
  { id: 20, name: "审判",    en: "Judgement",         meaning: "觉醒、重生、召唤、清算" },
  { id: 21, name: "世界",    en: "The World",         meaning: "完成、圆满、成就、旅程终点" },
];

const ZODIAC_LIST = [
  "白羊座","金牛座","双子座","巨蟹座","狮子座","处女座",
  "天秤座","天蝎座","射手座","摩羯座","水瓶座","双鱼座",
];

const PENTACLE_POSITIONS = [
  { label: "现在",   desc: "当下处境",   angle: -90,  r: 110 },
  { label: "过去",   desc: "根源与来路", angle: -18,  r: 110 },
  { label: "潜意识", desc: "隐藏的力量", angle:  54,  r: 110 },
  { label: "外部",   desc: "外界影响",   angle: 126,  r: 110 },
  { label: "结果",   desc: "可能的走向", angle: 198,  r: 110 },
];

// ─── SVG 牌面图案（每张独立设计）────────────────────────────────────────────
function CardFace({ cardId, reversed, size = 140 }) {
  const w = size, h = Math.round(size * 1.5);
  const cx = w / 2, cy = h / 2;
  const gold = "#b8956a";
  const goldD = "#9a7a52";
  const bg = "#0e0c1b";

  // 22张牌各自的几何图案
  const patterns = {
    0:  // 愚者 — 螺旋向外的圆圈
      <g transform={`translate(${cx},${cy - 10})`}>
        {[52,40,28,16].map((r,i) => <circle key={i} r={r} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.4 + i*0.12}/>)}
        <circle r={5} fill={gold} fillOpacity={0.6}/>
        {[0,60,120,180,240,300].map(a => {
          const rad = a*Math.PI/180;
          return <line key={a} x1={Math.cos(rad)*8} y1={Math.sin(rad)*8} x2={Math.cos(rad)*50} y2={Math.sin(rad)*50} stroke={gold} strokeWidth={0.5} strokeOpacity={0.3}/>;
        })}
        <path d={`M0,-52 C20,-30 30,0 0,52`} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
      </g>,
    1:  // 魔术师 — 无穷符号+竖杖
      <g transform={`translate(${cx},${cy - 8})`}>
        <path d="M-36,0 C-36,-22 -12,-22 0,0 C12,22 36,22 36,0 C36,-22 12,-22 0,0 C-12,22 -36,22 -36,0" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.65}/>
        <line x1={0} y1={-55} x2={0} y2={55} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <circle r={4} cy={-55} fill={gold} fillOpacity={0.55}/>
        <circle r={4} cy={55} fill={gold} fillOpacity={0.55}/>
        <circle r={28} fill="none" stroke={gold} strokeWidth={0.4} strokeOpacity={0.25}/>
      </g>,
    2:  // 女祭司 — 新月+双柱
      <g transform={`translate(${cx},${cy - 8})`}>
        <line x1={-38} y1={-58} x2={-38} y2={58} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <line x1={38} y1={-58} x2={38} y2={58} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <path d={`M-20,-35 A35,35 0 0,1 -20,35`} fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.7}/>
        <path d={`M-20,-35 Q10,0 -20,35`} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.3}/>
        <circle r={5} fill={gold} fillOpacity={0.5}/>
      </g>,
    3:  // 皇后 — 十字+花瓣
      <g transform={`translate(${cx},${cy - 8})`}>
        {[0,45,90,135].map(a => {
          const r=a*Math.PI/180;
          return <line key={a} x1={Math.cos(r)*-55} y1={Math.sin(r)*-55} x2={Math.cos(r)*55} y2={Math.sin(r)*55} stroke={gold} strokeWidth={0.7} strokeOpacity={0.4}/>;
        })}
        {[0,45,90,135,180,225,270,315].map(a => {
          const r=a*Math.PI/180, d=36;
          return <ellipse key={a} cx={Math.cos(r)*d} cy={Math.sin(r)*d} rx={10} ry={18} transform={`rotate(${a},${Math.cos(r)*d},${Math.sin(r)*d})`} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.38}/>;
        })}
        <circle r={7} fill={gold} fillOpacity={0.55}/>
      </g>,
    4:  // 皇帝 — 方形+四角权杖
      <g transform={`translate(${cx},${cy - 8})`}>
        <rect x={-40} y={-40} width={80} height={80} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.55}/>
        <rect x={-28} y={-28} width={56} height={56} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.3}/>
        {[[-40,-40],[40,-40],[40,40],[-40,40]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={4} fill={gold} fillOpacity={0.5}/>
        ))}
        <circle r={6} fill={gold} fillOpacity={0.6}/>
        <line x1={0} y1={-55} x2={0} y2={-42} stroke={gold} strokeWidth={1.2} strokeOpacity={0.5}/>
      </g>,
    5:  // 教皇 — 三层拱门
      <g transform={`translate(${cx},${cy - 8})`}>
        {[50,36,22].map((r,i) => (
          <path key={i} d={`M${-r},20 L${-r},${-r*0.3} A${r},${r} 0 0,1 ${r},${-r*0.3} L${r},20`} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.35+i*0.12}/>
        ))}
        <line x1={0} y1={-55} x2={0} y2={-52} stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <line x1={-14} y1={-44} x2={14} y2={-44} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <line x1={-14} y1={-38} x2={14} y2={-38} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <circle r={5} fill={gold} fillOpacity={0.55}/>
      </g>,
    6:  // 恋人 — 双心交融
      <g transform={`translate(${cx},${cy - 8})`}>
        <path d="M0,30 C-50,-10 -50,-50 0,-30 C50,-50 50,-10 0,30Z" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <path d="M0,30 C-30,0 -30,-30 0,-18 C30,-30 30,0 0,30Z" fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.35}/>
        <circle cx={0} cy={-52} r={6} fill={gold} fillOpacity={0.5}/>
        {[-25,25].map(x => <line key={x} x1={x} y1={-46} x2={0} y2={-18} stroke={gold} strokeWidth={0.6} strokeOpacity={0.3}/>)}
      </g>,
    7:  // 战车 — 方盾+车轮
      <g transform={`translate(${cx},${cy - 8})`}>
        <circle r={48} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.3}/>
        {[0,45,90,135,180,225,270,315].map(a => {
          const r=a*Math.PI/180;
          return <line key={a} x1={0} y1={0} x2={Math.cos(r)*46} y2={Math.sin(r)*46} stroke={gold} strokeWidth={0.5} strokeOpacity={0.3}/>;
        })}
        <circle r={14} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <rect x={-18} y={-20} width={36} height={40} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <circle r={4} fill={gold} fillOpacity={0.6}/>
      </g>,
    8:  // 力量 — 无穷符号+张口的圆
      <g transform={`translate(${cx},${cy - 8})`}>
        <circle r={42} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.28}/>
        <path d="M-30,8 A22,22 0 1,1 30,8" fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.65}/>
        <path d="M-30,8 C-30,30 30,30 30,8" fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.4}/>
        <path d="M-36,-18 C-36,-38 -12,-38 0,-18 C12,-38 36,-38 36,-18 C36,2 12,2 0,-18 C-12,2 -36,2 -36,-18" fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
      </g>,
    9:  // 隐者 — 提灯+六芒星光
      <g transform={`translate(${cx},${cy - 8})`}>
        <line x1={0} y1={-55} x2={0} y2={55} stroke={gold} strokeWidth={0.8} strokeOpacity={0.4}/>
        <rect x={-10} y={-28} width={20} height={30} rx={3} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        {[0,60,120,180,240,300].map(a => {
          const r=a*Math.PI/180;
          return <line key={a} x1={Math.cos(r)*12} y1={Math.sin(r)*12-13} x2={Math.cos(r)*30} y2={Math.sin(r)*30-13} stroke={gold} strokeWidth={0.5} strokeOpacity={0.35}/>;
        })}
        <circle cy={-13} r={7} fill={gold} fillOpacity={0.45}/>
      </g>,
    10: // 命运之轮 — 轮辐+外环符文
      <g transform={`translate(${cx},${cy - 8})`}>
        {[52,38,22].map((r,i) => <circle key={i} r={r} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.3+i*0.1}/>)}
        {[0,45,90,135,180,225,270,315].map(a => {
          const r=a*Math.PI/180;
          return <line key={a} x1={Math.cos(r)*22} y1={Math.sin(r)*22} x2={Math.cos(r)*38} y2={Math.sin(r)*38} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>;
        })}
        <circle r={5} fill={gold} fillOpacity={0.6}/>
        {[0,90,180,270].map(a => {
          const r=a*Math.PI/180;
          return <rect key={a} x={Math.cos(r)*44-3} y={Math.sin(r)*44-3} width={6} height={6} fill={gold} fillOpacity={0.45}/>;
        })}
      </g>,
    11: // 正义 — 天平
      <g transform={`translate(${cx},${cy - 8})`}>
        <line x1={0} y1={-55} x2={0} y2={50} stroke={gold} strokeWidth={1} strokeOpacity={0.55}/>
        <line x1={-46} y1={-20} x2={46} y2={-20} stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <line x1={-46} y1={-20} x2={-36} y2={10} stroke={gold} strokeWidth={0.6} strokeOpacity={0.4}/>
        <line x1={46} y1={-20} x2={36} y2={10} stroke={gold} strokeWidth={0.6} strokeOpacity={0.4}/>
        <ellipse cx={-36} cy={18} rx={14} ry={8} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.45}/>
        <ellipse cx={36} cy={18} rx={14} ry={8} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.45}/>
        <circle cy={-55} r={4} fill={gold} fillOpacity={0.5}/>
      </g>,
    12: // 倒吊人 — 倒置的人形
      <g transform={`translate(${cx},${cy - 8})`}>
        <circle cy={-40} r={14} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <line x1={0} y1={-26} x2={0} y2={20} stroke={gold} strokeWidth={1} strokeOpacity={0.5}/>
        <line x1={0} y1={0} x2={-28} y2={-16} stroke={gold} strokeWidth={0.8} strokeOpacity={0.45}/>
        <line x1={0} y1={0} x2={28} y2={-16} stroke={gold} strokeWidth={0.8} strokeOpacity={0.45}/>
        <line x1={0} y1={20} x2={-18} y2={42} stroke={gold} strokeWidth={0.8} strokeOpacity={0.4}/>
        <line x1={0} y1={20} x2={18} y2={42} stroke={gold} strokeWidth={0.8} strokeOpacity={0.4}/>
        <line x1={-30} y1={-55} x2={30} y2={-55} stroke={gold} strokeWidth={1} strokeOpacity={0.5}/>
      </g>,
    13: // 死神 — 镰刀+玫瑰
      <g transform={`translate(${cx},${cy - 8})`}>
        <path d="M-10,50 L-10,-20 A38,38 0 0,1 36,16Z" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <circle cy={-38} r={12} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.4}/>
        {[0,72,144,216,288].map(a => {
          const r=a*Math.PI/180;
          return <ellipse key={a} cx={Math.cos(r)*12} cy={Math.sin(r)*12-38} rx={5} ry={9} transform={`rotate(${a},${Math.cos(r)*12},${Math.sin(r)*12-38})`} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.35}/>;
        })}
      </g>,
    14: // 节制 — 双杯流水
      <g transform={`translate(${cx},${cy - 8})`}>
        <rect x={-32} y={-50} width={22} height={32} rx={3} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <rect x={10} y={-50} width={22} height={32} rx={3} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <path d="M-10,-34 C-4,-20 4,-20 10,-34" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <path d="M-10,-34 C-6,-10 6,-10 10,-34" fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.35}/>
        <circle cy={20} r={20} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.3}/>
        <path d={`M${-20*Math.sin(0.5)},${20+20*Math.cos(0.5)} A20,20 0 1,0 ${20*Math.sin(0.5)},${20+20*Math.cos(0.5)}`} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.45}/>
      </g>,
    15: // 恶魔 — 倒五芒星
      <g transform={`translate(${cx},${cy - 8})`}>
        {[90,162,234,306,18].map((a,i,arr) => {
          const next=arr[(i+2)%5];
          const r1=a*Math.PI/180, r2=next*Math.PI/180, R=48;
          return <line key={i} x1={Math.cos(r1)*R} y1={Math.sin(r1)*R} x2={Math.cos(r2)*R} y2={Math.sin(r2)*R} stroke={gold} strokeWidth={0.8} strokeOpacity={0.55}/>;
        })}
        <circle r={52} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.25}/>
        <circle r={6} fill={gold} fillOpacity={0.5}/>
        {[-20,20].map(x => <line key={x} x1={x} y1={-35} x2={x} y2={-20} stroke={gold} strokeWidth={0.8} strokeOpacity={0.4}/>)}
      </g>,
    16: // 高塔 — 塔+闪电
      <g transform={`translate(${cx},${cy - 8})`}>
        <rect x={-18} y={-50} width={36} height={70} rx={2} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.55}/>
        <rect x={-12} y={-58} width={24} height={12} rx={2} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.45}/>
        <path d="M30,-48 L12,-8 L24,-8 L6,40" fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.65}/>
        <circle cx={-30} cy={-40} r={4} fill={gold} fillOpacity={0.4}/>
        <circle cx={36} cy={10} r={3} fill={gold} fillOpacity={0.35}/>
      </g>,
    17: // 星星 — 八芒星+小星
      <g transform={`translate(${cx},${cy - 8})`}>
        <polygon points="0,-50 6,-6 50,0 6,6 0,50 -6,6 -50,0 -6,-6" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.65}/>
        <circle r={14} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.45}/>
        {[[-36,-36],[36,-36],[-36,36],[36,36]].map(([x,y],i) => (
          <polygon key={i} points={`${x},${y-10} ${x+2},${y-2} ${x+10},${y} ${x+2},${y+2} ${x},${y+10} ${x-2},${y+2} ${x-10},${y} ${x-2},${y-2}`} fill="none" stroke={gold} strokeWidth={0.6} strokeOpacity={0.4}/>
        ))}
        <circle r={5} fill={gold} fillOpacity={0.6}/>
      </g>,
    18: // 月亮 — 月相+波浪
      <g transform={`translate(${cx},${cy - 8})`}>
        <path d="M-10,-50 A36,36 0 1,1 -10,50 A28,28 0 1,0 -10,-50Z" fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.6}/>
        <path d="M-52,20 C-36,10 -20,30 0,20 C20,10 36,30 52,20" fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.45}/>
        <path d="M-52,32 C-36,22 -20,42 0,32 C20,22 36,42 52,32" fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.3}/>
        <circle cy={-38} r={5} fill={gold} fillOpacity={0.5}/>
      </g>,
    19: // 太阳 — 光芒放射
      <g transform={`translate(${cx},${cy - 8})`}>
        <circle r={24} fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.65}/>
        {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((a,i) => {
          const r=a*Math.PI/180, inner=i%2===0?28:26, outer=i%2===0?52:42;
          return <line key={a} x1={Math.cos(r)*inner} y1={Math.sin(r)*inner} x2={Math.cos(r)*outer} y2={Math.sin(r)*outer} stroke={gold} strokeWidth={i%2===0?0.8:0.5} strokeOpacity={i%2===0?0.55:0.35}/>;
        })}
        <circle r={8} fill={gold} fillOpacity={0.55}/>
      </g>,
    20: // 审判 — 号角+人形
      <g transform={`translate(${cx},${cy - 8})`}>
        <path d="M-8,-55 L-8,-18 L20,-30 Z" fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <path d="M-8,-18 C-8,-10 20,-22 20,-14" fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.4}/>
        {[-20,0,20].map(x => (
          <g key={x}>
            <circle cx={x} cy={25} r={8} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.45}/>
            <line x1={x} y1={33} x2={x} y2={52} stroke={gold} strokeWidth={0.6} strokeOpacity={0.4}/>
          </g>
        ))}
        <line x1={-55} y1={-20} x2={55} y2={-20} stroke={gold} strokeWidth={0.5} strokeOpacity={0.28}/>
      </g>,
    21: // 世界 — 月桂环+中心人
      <g transform={`translate(${cx},${cy - 8})`}>
        <ellipse rx={44} ry={56} fill="none" stroke={gold} strokeWidth={1} strokeOpacity={0.55}/>
        <ellipse rx={36} ry={48} fill="none" stroke={gold} strokeWidth={0.4} strokeOpacity={0.25}/>
        {[0,45,90,135,180,225,270,315].map(a => {
          const r=a*Math.PI/180;
          return <circle key={a} cx={Math.cos(r)*44} cy={Math.sin(r)*56} r={3} fill={gold} fillOpacity={0.4}/>;
        })}
        <circle r={10} fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
        <circle r={4} fill={gold} fillOpacity={0.55}/>
        <line x1={0} y1={-20} x2={0} y2={20} stroke={gold} strokeWidth={0.6} strokeOpacity={0.35}/>
        <line x1={-14} y1={0} x2={14} y2={0} stroke={gold} strokeWidth={0.6} strokeOpacity={0.35}/>
      </g>,
  };

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg"
      style={{ transform: reversed ? "rotate(180deg)" : "none", transition: "transform 0.5s 0.3s", display: "block" }}>
      {/* 背景 */}
      <rect width={w} height={h} rx={10} fill={bg}/>
      {/* 外边框 */}
      <rect x={1} y={1} width={w-2} height={h-2} rx={9} fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.55}/>
      {/* 内边框 */}
      <rect x={7} y={7} width={w-14} height={h-14} rx={6} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.28}/>
      {/* 图案区域 */}
      <rect x={10} y={32} width={w-20} height={h-68} rx={4} fill="none" stroke={gold} strokeWidth={0.4} strokeOpacity={0.2}/>

      {/* 顶部装饰 */}
      <line x1={14} y1={22} x2={w-14} y2={22} stroke={gold} strokeWidth={0.5} strokeOpacity={0.35}/>
      <text x={cx} y={19} textAnchor="middle" fontFamily="serif" fontSize={8} fill={gold} fillOpacity={0.5} letterSpacing={3}>
        {String(cardId).padStart(2,"0")}
      </text>

      {/* 主图案 */}
      <clipPath id={`cp-${cardId}`}>
        <rect x={10} y={32} width={w-20} height={h-68}/>
      </clipPath>
      <g clipPath={`url(#cp-${cardId})`}>
        {patterns[cardId]}
      </g>

      {/* 底部横线 */}
      <line x1={14} y1={h-32} x2={w-14} y2={h-32} stroke={gold} strokeWidth={0.5} strokeOpacity={0.35}/>
      {/* 英文名 */}
      <text x={cx} y={h-22} textAnchor="middle" fontFamily="serif" fontSize={7} fill={gold} fillOpacity={0.38} letterSpacing={2}>
        {MAJOR_ARCANA.find(c=>c.id===cardId)?.en.toUpperCase()}
      </text>
    </svg>
  );
}

// 牌背面
function CardBack({ size = 140 }) {
  const w = size, h = Math.round(size * 1.5);
  const cx = w/2, cy = h/2;
  const gold = "#b8956a";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <rect width={w} height={h} rx={10} fill="#0e0c1b"/>
      <rect x={1} y={1} width={w-2} height={h-2} rx={9} fill="none" stroke={gold} strokeWidth={1.2} strokeOpacity={0.5}/>
      <rect x={6} y={6} width={w-12} height={h-12} rx={6} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.25}/>
      {/* 斜格纹 */}
      {Array.from({length:18}).map((_,i) => (
        <line key={i} x1={-10+i*12} y1={0} x2={-10+i*12-h} y2={h} stroke={gold} strokeWidth={0.4} strokeOpacity={0.13}/>
      ))}
      {Array.from({length:18}).map((_,i) => (
        <line key={i+100} x1={-10+i*12} y1={0} x2={-10+i*12+h} y2={h} stroke={gold} strokeWidth={0.4} strokeOpacity={0.13}/>
      ))}
      {/* 中心装饰 */}
      <circle cx={cx} cy={cy} r={30} fill="none" stroke={gold} strokeWidth={0.7} strokeOpacity={0.4}/>
      <circle cx={cx} cy={cy} r={20} fill="none" stroke={gold} strokeWidth={0.5} strokeOpacity={0.3}/>
      <polygon points={`${cx},${cy-26} ${cx+6},${cy-6} ${cx+26},${cy} ${cx+6},${cy+6} ${cx},${cy+26} ${cx-6},${cy+6} ${cx-26},${cy} ${cx-6},${cy-6}`}
        fill="none" stroke={gold} strokeWidth={0.8} strokeOpacity={0.5}/>
      <circle cx={cx} cy={cy} r={5} fill={gold} fillOpacity={0.45}/>
      <text x={cx} y={cy-36} textAnchor="middle" fontFamily="serif" fontSize={8} fill={gold} fillOpacity={0.35} letterSpacing={4}>TAROT</text>
    </svg>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS_ID = "tarot-v2-css";
function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const el = document.createElement("style");
  el.id = CSS_ID;
  el.textContent = `
@keyframes tv2-float {
  0%,100%{transform:translate(var(--tx),var(--ty)) rotate(var(--r)) scale(var(--s))}
  33%{transform:translate(calc(var(--tx) + 8px),calc(var(--ty) - 12px)) rotate(calc(var(--r) + 5deg)) scale(calc(var(--s) + .03))}
  66%{transform:translate(calc(var(--tx) - 6px),calc(var(--ty) + 8px)) rotate(calc(var(--r) - 3deg)) scale(calc(var(--s) - .02))}
}
@keyframes tv2-fly {
  0%{opacity:1;transform:translate(var(--tx),var(--ty)) rotate(var(--r)) scale(var(--s))}
  100%{opacity:0;transform:translate(calc(var(--tx)+var(--ex)),calc(var(--ty)+var(--ey))) rotate(calc(var(--r)+180deg)) scale(.05)}
}
@keyframes tv2-appear {
  0%{opacity:0;transform:translate(-50%,-50%) scale(.5) rotateY(90deg)}
  60%{opacity:1;transform:translate(-50%,-50%) scale(1.05) rotateY(-8deg)}
  100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotateY(0deg)}
}
@keyframes tv2-pentappear {
  0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}
  100%{opacity:1;transform:translate(-50%,-50%) scale(1)}
}
@keyframes tv2-fadein {
  0%{opacity:0;transform:translateY(12px)}
  100%{opacity:1;transform:translateY(0)}
}
@keyframes tv2-pulse {
  0%,100%{opacity:.55} 50%{opacity:.85}
}
@keyframes tv2-draw {
  from{stroke-dashoffset:600} to{stroke-dashoffset:0}
}
.tv2-card-float{animation:tv2-float 3s ease-in-out infinite}
.tv2-card-fly{animation:tv2-fly .6s cubic-bezier(.4,0,1,1) forwards}
.tv2-single-appear{animation:tv2-appear .75s cubic-bezier(.34,1.3,.64,1) forwards}
.tv2-pent-appear{animation:tv2-pentappear .5s cubic-bezier(.34,1.2,.64,1) forwards}
.tv2-fadein{animation:tv2-fadein .5s ease-out forwards}
.tv2-pulse{animation:tv2-pulse 2s ease-in-out infinite}
.tv2-draw{stroke-dasharray:600;animation:tv2-draw 1.2s ease-out forwards}
`;
  document.head.appendChild(el);
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function pickCards(n) {
  const pool = [...MAJOR_ARCANA];
  const result = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push({ card: pool.splice(idx, 1)[0], reversed: Math.random() < 0.5 });
  }
  return result;
}

function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── 洗牌舞台 ─────────────────────────────────────────────────────────────────
function ShuffleStage({ phase, animCards, selectedIndices }) {
  if (phase !== "shuffling" && phase !== "selecting") return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {animCards.map((c, i) => {
        const isSelected = selectedIndices.includes(i);
        const isLeaving = phase === "selecting" && !isSelected;
        return (
          <div key={i}
            className={isLeaving ? "tv2-card-fly" : "tv2-card-float"}
            style={{
              position: "absolute",
              left: 0, top: 0,
              "--tx": c.x + "px",
              "--ty": c.y + "px",
              "--r": c.r + "deg",
              "--s": String(c.s),
              "--ex": c.ex + "px",
              "--ey": c.ey + "px",
              transform: `translate(${c.x}px,${c.y}px) rotate(${c.r}deg) scale(${c.s})`,
              animationDelay: isLeaving ? c.flyDelay + "ms" : c.floatOffset + "ms",
              animationDuration: isLeaving ? ".6s" : (2.8 + Math.random() * 0.6) + "s",
              zIndex: isSelected ? 10 : 1,
              pointerEvents: "none",
            }}>
            <CardBack size={66}/>
          </div>
        );
      })}
    </div>
  );
}

// ─── 单张揭示 ─────────────────────────────────────────────────────────────────
function SingleReveal({ drawn, flipped }) {
  if (!drawn) return null;
  return (
    <div className="tv2-single-appear"
      style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-50%)", perspective: 1000, zIndex: 20 }}>
      <div style={{
        position: "relative",
        width: 140, height: 210,
        transformStyle: "preserve-3d",
        transition: "transform .85s cubic-bezier(.4,0,.2,1)",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
          <CardBack size={140}/>
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <CardFace cardId={drawn.card.id} reversed={drawn.reversed} size={140}/>
        </div>
      </div>
    </div>
  );
}

// ─── 五芒星阵 ─────────────────────────────────────────────────────────────────
function PentacleSpread({ drawnCards, revealedCount }) {
  const W = 340, H = 300, cx = W/2, cy = H/2 - 10;
  const R = 108;
  const cardW = 70, cardH = 105;

  const positions = PENTACLE_POSITIONS.map((p, i) => {
    const a = p.angle * Math.PI / 180;
    return { x: cx + Math.cos(a) * R - cardW/2, y: cy + Math.sin(a) * R - cardH/2, ...p };
  });

  return (
    <div className="tv2-pent-appear"
      style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: W, zIndex: 20 }}>
      {/* 五芒星线 */}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
        viewBox={`0 0 ${W} ${H}`}>
        {/* 五芒星连线 */}
        {[0,2,4,1,3,0].reduce((acc, pi, i, arr) => {
          if (i === arr.length - 1) return acc;
          const a1 = PENTACLE_POSITIONS[pi].angle * Math.PI/180;
          const a2 = PENTACLE_POSITIONS[arr[i+1]].angle * Math.PI/180;
          acc.push(
            <line key={i}
              x1={cx + Math.cos(a1)*R} y1={cy + Math.sin(a1)*R}
              x2={cx + Math.cos(a2)*R} y2={cy + Math.sin(a2)*R}
              stroke="#b8956a" strokeWidth={0.6} strokeOpacity={0.3}
              className="tv2-draw"
              style={{ animationDelay: i * 0.18 + "s" }}/>
          );
          return acc;
        }, [])}
        {/* 中心圆 */}
        <circle cx={cx} cy={cy} r={16} fill="none" stroke="#b8956a" strokeWidth={0.5} strokeOpacity={0.3}
          className="tv2-draw" style={{ animationDelay: "0.9s" }}/>
      </svg>

      {/* 牌位 */}
      {positions.map((pos, i) => (
        <div key={i} style={{
          position: "absolute",
          left: pos.x, top: pos.y,
          width: cardW, height: cardH,
          transition: `opacity .4s ease ${i * 0.12}s, transform .4s ease ${i * 0.12}s`,
          opacity: revealedCount > i ? 1 : 0.15,
          transform: revealedCount > i ? "scale(1)" : "scale(0.85)",
        }}>
          {revealedCount > i && drawnCards[i] ? (
            <CardFace cardId={drawnCards[i].card.id} reversed={drawnCards[i].reversed} size={cardW}/>
          ) : (
            <CardBack size={cardW}/>
          )}
          {/* 位置标签 */}
          <div style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)",
            bottom: i < 2 ? -18 : (i === 2 ? -18 : (i === 3 ? -18 : -18)),
            fontSize: 9, color: "#b8956a", opacity: 0.6,
            fontFamily: "serif", letterSpacing: 1, whiteSpace: "nowrap",
          }}>{pos.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function TarotView() {
  const [zodiac, setZodiac] = useState(() => localStorage.getItem("tarot_zodiac") || "");
  const [editingZodiac, setEditingZodiac] = useState(!localStorage.getItem("tarot_zodiac"));
  const [questionType, setQuestionType] = useState(null); // "small" | "big"
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | shuffling | selecting | revealing | interpreting
  const [drawn, setDrawn] = useState(null);        // 单张
  const [drawnCards, setDrawnCards] = useState([]); // 五张
  const [revealedCount, setRevealedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [animCards, setAnimCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [interpretation, setInterpretation] = useState("");
  const [revealText, setRevealText] = useState("");
  const [error, setError] = useState("");
  const timers = useRef({});

  useEffect(() => { injectCss(); return () => { Object.values(timers.current).forEach(clearTimeout); }; }, []);

  const saveZodiac = (z) => {
    setZodiac(z);
    localStorage.setItem("tarot_zodiac", z);
    setEditingZodiac(false);
  };

  // 生成洗牌动画数据
  const genAnimCards = useCallback(() => {
    const seed = Date.now();
    const shuffled = seededShuffle(MAJOR_ARCANA, seed);
    const stageW = 300, stageH = 360;
    return shuffled.map((_, i) => ({
      x: 20 + Math.random() * (stageW - 80),
      y: 20 + Math.random() * (stageH - 110),
      r: (Math.random() - 0.5) * 60,
      s: 0.65 + Math.random() * 0.3,
      floatOffset: i * 28,
      flyDelay: i * 22,
      ex: (Math.random() - 0.5) * 300,
      ey: (Math.random() - 0.5) * 300,
    }));
  }, []);

  const runSmallDraw = useCallback(async () => {
    const picked = pickCards(1)[0];
    setDrawn(picked);
    const cards = genAnimCards();
    setAnimCards(cards);
    setSelectedIndices([]);
    setPhase("shuffling");

    timers.current.a = setTimeout(() => {
      // 随机选一个留下
      const sel = Math.floor(Math.random() * cards.length);
      setSelectedIndices([sel]);
      setPhase("selecting");

      timers.current.b = setTimeout(() => {
        setAnimCards([]);
        setPhase("revealing");
        timers.current.c = setTimeout(() => setFlipped(true), 300);
        timers.current.d = setTimeout(() => setPhase("interpreting"), 1100);
      }, cards.length * 22 + 400);
    }, 1800);

    return picked;
  }, [genAnimCards]);

  const runBigDraw = useCallback(async () => {
    const picked = pickCards(5);
    setDrawnCards(picked);
    const cards = genAnimCards();
    setAnimCards(cards);
    setSelectedIndices([]);
    setPhase("shuffling");

    timers.current.a = setTimeout(() => {
      const sels = Array.from({length:5}, (_,i) => i);
      setSelectedIndices(sels);
      setPhase("selecting");

      timers.current.b = setTimeout(() => {
        setAnimCards([]);
        setPhase("revealing");
        // 逐步揭示
        let count = 0;
        const reveal = () => {
          count++;
          setRevealedCount(count);
          if (count < 5) timers.current["r"+count] = setTimeout(reveal, 320);
          else timers.current.d = setTimeout(() => setPhase("interpreting"), 500);
        };
        timers.current.r0 = setTimeout(reveal, 400);
      }, cards.length * 22 + 400);
    }, 1800);

    return picked;
  }, [genAnimCards]);

  const handleDraw = useCallback(async () => {
    if (!question.trim()) return;
    setError(""); setInterpretation(""); setRevealText(""); setFlipped(false);
    setRevealedCount(0); setDrawn(null); setDrawnCards([]);

    const isBig = questionType === "big";
    const pickedCards = isBig ? await runBigDraw() : await runSmallDraw();

    // 调用 AI
    try {
      const settings = getModelSettings();
      if (!settings.apiKey) { setTimeout(() => setError("请先在设置里填写 API Key"), 4000); return; }

      const cardDesc = isBig
        ? PENTACLE_POSITIONS.map((p, i) => {
            const c = pickedCards[i];
            return `【${p.label}·${p.desc}】${c.card.name}${c.reversed?"（逆位）":"（正位）"} — ${c.card.meaning}`;
          }).join("\n")
        : `${pickedCards.card.name}${pickedCards.reversed?"（逆位）":"（正位）"} — ${pickedCards.card.meaning}`;

      const zodiacLine = zodiac ? `提问者星座：${zodiac}。` : "";
      const prompt = `你是一位温柔而神秘的塔罗占卜师，语言诗意、克制，不超过${isBig?280:160}字，不用 emoji，中文回复。

${zodiacLine}
提问者的问题：「${question.trim()}」
${isBig ? "五芒星阵牌面：\n" + cardDesc : "抽到的牌：" + cardDesc}

${isBig ? "请逐一解读五张牌的位置含义，最后给出整体启示。" : "请针对问题解读这张牌，联系提问者处境，给出启示。"}`;

      const resp = await callOpenAICompatible({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "你是塔罗占卜师，诗意温柔，言简意赅。",
        settings,
      });
      const interp = resp?.text || "";
      setInterpretation(interp);
      if (interp) {
        let i = 0;
        timers.current.type = setInterval(() => {
          i++;
          setRevealText(interp.slice(0, i));
          if (i >= interp.length) clearInterval(timers.current.type);
        }, 35);
      }
    } catch (err) {
      setTimeout(() => setError(err.message || "请求失败"), 4000);
    }
  }, [question, questionType, zodiac, runSmallDraw, runBigDraw]);

  const reset = () => {
    setPhase("idle"); setDrawn(null); setDrawnCards([]); setRevealedCount(0);
    setFlipped(false); setAnimCards([]); setSelectedIndices([]);
    setInterpretation(""); setRevealText(""); setError(""); setQuestion("");
    setQuestionType(null);
  };

  const gold = "#b8956a";
  const bg = "#0e0c1b";
  const stageH = questionType === "big" ? 340 : 300;

  // ── 星座设置界面 ──
  if (editingZodiac) {
    return (
      <div style={{ padding: "24px 16px", minHeight: "100%" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--text-main) 60%, transparent)", marginBottom: 4, fontFamily: "serif", letterSpacing: 2 }}>BIRTH SIGN</div>
          <div style={{ fontSize: 20, color: "var(--text-main)", fontWeight: 400, marginBottom: 2 }}>你的星座是？</div>
          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--text-main) 40%, transparent)", marginTop: 4 }}>占卜师需要知道你的星象，以给出更准确的解读</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {ZODIAC_LIST.map(z => (
            <button key={z} onClick={() => saveZodiac(z)}
              style={{
                padding: "12px 0",
                border: "1px solid rgba(184,149,106,0.3)",
                borderRadius: 8,
                background: "rgba(184,149,106,0.05)",
                color: "rgba(232,221,208,0.8)",
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(184,149,106,0.12)"; e.currentTarget.style.borderColor="rgba(184,149,106,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(184,149,106,0.05)"; e.currentTarget.style.borderColor="rgba(184,149,106,0.3)"; }}>
              {z}
            </button>
          ))}
        </div>
        {zodiac && (
          <button onClick={() => setEditingZodiac(false)}
            style={{ marginTop: 16, width: "100%", padding: "10px 0", border: "1px solid rgba(184,149,106,0.3)", borderRadius: 8, background: "transparent", color: "rgba(184,149,106,0.6)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            取消
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 14px", minHeight: "100%", background: "var(--shell-bg)" }}>

      {/* 顶部星座 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "rgba(184,149,106,0.5)", fontFamily: "serif", letterSpacing: 3 }}>TAROT · ARCANA</div>
        <button onClick={() => setEditingZodiac(true)}
          style={{ border: "1px solid rgba(184,149,106,0.25)", borderRadius: 6, background: "rgba(184,149,106,0.06)", padding: "3px 10px", fontSize: 11, color: "color-mix(in srgb, var(--text-main) 60%, transparent)", cursor: "pointer", fontFamily: "serif", letterSpacing: 1 }}>
          {zodiac || "设定星座"} {zodiac ? "↻" : ""}
        </button>
      </div>

      {/* 问题类型选择 */}
      {phase === "idle" && !questionType && (
        <div className="tv2-fadein" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--text-main) 40%, transparent)", marginBottom: 10, textAlign: "center", letterSpacing: 1 }}>选择你的问题规模</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { type: "small", title: "小问题", sub: "抽一张牌 · 单刀直入", icon: "✦" },
              { type: "big",   title: "大问题", sub: "五芒星阵 · 五张解读", icon: "⬠" },
            ].map(opt => (
              <button key={opt.type} onClick={() => setQuestionType(opt.type)}
                style={{
                  border: "1px solid rgba(184,149,106,0.3)",
                  borderRadius: 10,
                  background: "rgba(184,149,106,0.04)",
                  padding: "14px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background="rgba(184,149,106,0.1)"; e.currentTarget.style.borderColor="rgba(184,149,106,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.background="rgba(184,149,106,0.04)"; e.currentTarget.style.borderColor="rgba(184,149,106,0.3)"; }}>
                <div style={{ fontSize: 20, color: gold, opacity: 0.7, marginBottom: 6 }}>{opt.icon}</div>
                <div style={{ fontSize: 14, color: "var(--text-main)", fontWeight: 500, marginBottom: 4 }}>{opt.title}</div>
                <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--text-main) 40%, transparent)", lineHeight: 1.5 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 问题输入区 */}
      {questionType && phase === "idle" && (
        <div className="tv2-fadein" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(184,149,106,0.55)", fontFamily: "serif", letterSpacing: 2 }}>
              {questionType === "small" ? "ONE CARD" : "PENTACLE SPREAD"}
            </div>
            <button onClick={() => setQuestionType(null)}
              style={{ marginLeft: "auto", border: "none", background: "none", color: "rgba(184,149,106,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "serif" }}>
              ← 重选
            </button>
          </div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder={questionType === "big" ? "这个问题关乎人生走向，或关系的深层……" : "比如：我和 TA 的关系会如何发展？"}
            rows={2}
            style={{ width: "100%", resize: "vertical", border: "1px solid rgba(184,149,106,0.25)", borderRadius: 8, outline: "none", background: "rgba(184,149,106,0.04)", color: "var(--text-main)", fontSize: 13, lineHeight: 1.7, padding: "10px 12px", fontFamily: "inherit", boxSizing: "border-box" }}/>
          <button onClick={handleDraw} disabled={!question.trim()}
            style={{ marginTop: 10, width: "100%", padding: "11px 0", border: "1px solid rgba(184,149,106,0.35)", borderRadius: 10, background: question.trim() ? "rgba(184,149,106,0.12)" : "transparent", color: question.trim() ? gold : "rgba(184,149,106,0.3)", fontSize: 14, fontWeight: 400, cursor: question.trim() ? "pointer" : "default", fontFamily: "serif", letterSpacing: 2, transition: "all .2s" }}>
            {questionType === "small" ? "命运，揭示" : "星阵，展开"}
          </button>
        </div>
      )}

      {/* 动画舞台 */}
      {(phase === "shuffling" || phase === "selecting" || phase === "revealing") && (
        <div style={{ position: "relative", width: "100%", height: stageH, marginBottom: 8, overflow: "hidden" }}>
          <ShuffleStage phase={phase} animCards={animCards} selectedIndices={selectedIndices}/>

          {phase === "revealing" && questionType === "small" && drawn && (
            <SingleReveal drawn={drawn} flipped={flipped}/>
          )}
          {phase === "revealing" && questionType === "big" && (
            <PentacleSpread drawnCards={drawnCards} revealedCount={revealedCount}/>
          )}
        </div>
      )}

      {/* 解读区 */}
      {phase === "interpreting" && (
        <div className="tv2-fadein">
          {/* 小问题：卡片+文字 */}
          {questionType === "small" && drawn && (
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ flexShrink: 0 }}>
                <CardFace cardId={drawn.card.id} reversed={drawn.reversed} size={80}/>
              </div>
              <div>
                <div style={{ fontSize: 18, color: "var(--text-main)", fontWeight: 400, fontFamily: "serif", marginBottom: 2 }}>
                  {drawn.card.name}
                </div>
                {drawn.reversed && <div style={{ fontSize: 11, color: "#c87070", marginBottom: 4, letterSpacing: 1 }}>逆 位</div>}
                <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--text-main) 35%, transparent)", fontFamily: "serif", letterSpacing: 2, marginBottom: 6 }}>{drawn.card.en.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "rgba(184,149,106,0.6)", lineHeight: 1.6 }}>{drawn.card.meaning}</div>
              </div>
            </div>
          )}

          {/* 大问题：五张缩略 */}
          {questionType === "big" && drawnCards.length === 5 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
                {drawnCards.map((dc, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <CardFace cardId={dc.card.id} reversed={dc.reversed} size={48}/>
                    <div style={{ fontSize: 9, color: "rgba(184,149,106,0.55)", marginTop: 3, fontFamily: "serif" }}>{PENTACLE_POSITIONS[i].label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 解读文字 */}
          {(revealText || error) && (
            <div style={{ padding: "14px", border: "1px solid rgba(184,149,106,0.2)", borderRadius: 10, background: "rgba(184,149,106,0.04)", fontSize: 13, lineHeight: 1.9, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
              {error || revealText}
              {revealText && revealText.length < interpretation.length && (
                <span style={{ display: "inline-block", width: 1, height: 15, background: gold, opacity: 0.5, marginLeft: 2, verticalAlign: "text-bottom" }}/>
              )}
            </div>
          )}

          {/* 再来一次 */}
          {revealText && revealText.length >= interpretation.length && (
            <div className="tv2-fadein" style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={reset}
                style={{ border: "1px solid rgba(184,149,106,0.25)", borderRadius: 8, background: "transparent", padding: "8px 24px", fontSize: 12, color: "rgba(184,149,106,0.6)", cursor: "pointer", fontFamily: "serif", letterSpacing: 2 }}>
                再 问 一 次
              </button>
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {phase === "idle" && !questionType && (
        <div style={{ textAlign: "center", padding: "32px 0 16px", opacity: 0.35 }}>
          <svg width={48} height={48} viewBox="0 0 48 48" style={{ margin: "0 auto 10px" }}>
            <polygon points="24,4 28,20 44,24 28,28 24,44 20,28 4,24 20,20" fill="none" stroke={gold} strokeWidth={1}/>
            <circle cx={24} cy={24} r={4} fill={gold} fillOpacity={0.5}/>
          </svg>
          <div style={{ fontSize: 13, color: "var(--text-main)" }}>选择问题规模，开始占卜</div>
          {zodiac && <div style={{ fontSize: 11, color: "rgba(184,149,106,0.5)", marginTop: 4, fontFamily: "serif" }}>{zodiac}</div>}
        </div>
      )}
    </div>
  );
}