import { useState, useEffect, useRef, useCallback } from "react";
import { getModelSettings } from "../../store/settings.js";
import { callOpenAICompatible } from "../../api/providers/openaiCompatible.js";

const MAJOR_ARCANA = [
  { id: 0, name: "愚者", en: "The Fool", meaning: "新的开始、冒险、天真、自由" },
  { id: 1, name: "魔术师", en: "The Magician", meaning: "创造力、技巧、意志力、显化" },
  { id: 2, name: "女祭司", en: "The High Priestess", meaning: "直觉、潜意识、神秘、内在智慧" },
  { id: 3, name: "皇后", en: "The Empress", meaning: "丰饶、母性、自然、感官享受" },
  { id: 4, name: "皇帝", en: "The Emperor", meaning: "权威、结构、稳定、父亲形象" },
  { id: 5, name: "教皇", en: "The Hierophant", meaning: "传统、信仰、教育、精神指引" },
  { id: 6, name: "恋人", en: "The Lovers", meaning: "爱情、选择、和谐、关系" },
  { id: 7, name: "战车", en: "The Chariot", meaning: "意志力、胜利、决心、前进" },
  { id: 8, name: "力量", en: "Strength", meaning: "勇气、耐心、内在力量、柔和" },
  { id: 9, name: "隐者", en: "The Hermit", meaning: "内省、孤独、寻求真理、指引" },
  { id: 10, name: "命运之轮", en: "Wheel of Fortune", meaning: "命运、转折、循环、机遇" },
  { id: 11, name: "正义", en: "Justice", meaning: "公正、真理、因果、法律" },
  { id: 12, name: "倒吊人", en: "The Hanged Man", meaning: "牺牲、换个角度看世界、停滞" },
  { id: 13, name: "死神", en: "Death", meaning: "结束、转变、重生、放下" },
  { id: 14, name: "节制", en: "Temperance", meaning: "平衡、调和、耐心、中庸" },
  { id: 15, name: "恶魔", en: "The Devil", meaning: "束缚、欲望、物质主义、阴影" },
  { id: 16, name: "高塔", en: "The Tower", meaning: "突变、崩塌、启示、打破幻象" },
  { id: 17, name: "星星", en: "The Star", meaning: "希望、信念、疗愈、灵感" },
  { id: 18, name: "月亮", en: "The Moon", meaning: "幻觉、恐惧、潜意识、梦境" },
  { id: 19, name: "太阳", en: "The Sun", meaning: "快乐、成功、活力、真相" },
  { id: 20, name: "审判", en: "Judgement", meaning: "觉醒、重生、召唤、清算" },
  { id: 21, name: "世界", en: "The World", meaning: "完成、圆满、成就、旅程终点" },
];

const TAROT_SYMBOLS = ["☉","☽","☆","✧","◈","◆","◇","○","△","□","♁","♃","♄","♅","♆","♇","☿","♀","♂","♈","♉","♊"];
const CARD_W = 90, CARD_H = 136, FINAL_W = 140, FINAL_H = 210, STAGE_H = 440;

function pickCard() {
  const idx = Math.floor(Math.random() * MAJOR_ARCANA.length);
  return { card: MAJOR_ARCANA[idx], reversed: Math.random() < 0.5 };
}

function seededShuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// CSS injected into head once
const CSS_ID = "tarot-anim-css";
function injectCss() {
  if (document.getElementById(CSS_ID)) return;
  const el = document.createElement("style");
  el.id = CSS_ID;
  el.textContent = `
@keyframes tf {
  0%,100%{transform:translate(0,0) rotate(var(--r)) scale(var(--s))}
  25%{transform:translate(10px,-14px) rotate(calc(var(--r) + 6deg)) scale(calc(var(--s) + .04))}
  50%{transform:translate(-6px,-3px) rotate(calc(var(--r) - 4deg)) scale(calc(var(--s) - .02))}
  75%{transform:translate(8px,10px) rotate(calc(var(--r) + 3deg)) scale(var(--s))}
}
@keyframes tx {
  0%{opacity:1;transform:translate(0,0) rotate(var(--r)) scale(var(--s))}
  100%{opacity:0;transform:translate(var(--ex),var(--ey)) rotate(calc(var(--r) + 140deg)) scale(.08)}
}
@keyframes ti {
  0%{opacity:0;transform:translate(-50%,-50%) scale(.3) rotate(15deg)}
  100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0deg)}
}
@keyframes tg {
  0%,100%{box-shadow:0 0 20px rgba(140,120,100,.2),0 0 50px rgba(140,120,100,.06)}
  50%{box-shadow:0 0 35px rgba(160,140,110,.35),0 0 80px rgba(160,140,110,.12)}
}
@keyframes tu {
  0%{opacity:0;transform:translateY(16px)}
  100%{opacity:1;transform:translateY(0)}
}
.tst{position:relative;width:100%;height:${STAGE_H}px;overflow:hidden;margin-bottom:12px}
.tcd{position:absolute;width:${CARD_W}px;height:${CARD_H}px;border-radius:10px;background:linear-gradient(145deg,#1c1c2e,#1a2740 50%,#122544);border:2px solid rgba(160,142,120,.35);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,.25);flex-shrink:0}
.tcd.sf{animation:tf 2.6s ease-in-out infinite}
.tcd.sl:not(.al){animation:tx .65s ease-in forwards;animation-delay:var(--xd)}
.tcp{width:78%;height:84%;border:1.5px solid rgba(160,142,120,.35);border-radius:6px;background:repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(160,142,120,.06) 3px,rgba(160,142,120,.06) 6px);display:grid;place-items:center}
.tfw{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);perspective:1000px;animation:ti .7s cubic-bezier(.34,1.56,.64,1) forwards}
.tfi{position:relative;width:${FINAL_W}px;height:${FINAL_H}px;transition:transform .8s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d}
.tfi.fp{transform:rotateY(180deg)}
.tff,.tfb{position:absolute;inset:0;backface-visibility:hidden;border-radius:14px}
.tff{background:linear-gradient(145deg,#1c1c2e,#1a2740 50%,#122544);border:2.5px solid rgba(160,142,120,.45);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 40px rgba(0,0,0,.3);animation:tg 2.5s ease-in-out infinite}
.tfp{width:80%;height:86%;border:2px solid rgba(160,142,120,.4);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(160,142,120,.05) 4px,rgba(160,142,120,.05) 8px)}
.tfc{width:36px;height:36px;border-radius:50%;border:2px solid rgba(160,142,120,.5);display:grid;place-items:center}
.tfb{transform:rotateY(180deg);background:var(--panel-bg);border:1.5px solid var(--border-color);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px;box-sizing:border-box;box-shadow:0 8px 40px rgba(0,0,0,.15)}
`;
  document.head.appendChild(el);
}

export default function TarotView() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [animCards, setAnimCards] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [revealText, setRevealText] = useState("");
  const [finalVisible, setFinalVisible] = useState(false);
  const timers = useRef({});

  useEffect(() => {
    injectCss();
    return () => { clearTimeout(timers.current.a); clearInterval(timers.current.r); };
  }, []);

  const genPositions = useCallback(() => {
    const seed = Date.now();
    const shuffled = seededShuffle(MAJOR_ARCANA, seed);
    return shuffled.map((_, i) => {
      const angle = (i / shuffled.length) * Math.PI * 2 + (seed % 100) * 0.01;
      const radius = 28 + Math.random() * 30;
      return {
        x: 50 + Math.cos(angle) * radius,
        y: 42 + Math.sin(angle) * radius * 0.65,
        rotate: (Math.random() - 0.5) * 70,
        scale: 0.7 + Math.random() * 0.35,
        delay: i * 25,
        symbol: TAROT_SYMBOLS[i % TAROT_SYMBOLS.length],
      };
    });
  }, []);

  const runAnim = useCallback((selIdx) => {
    const pos = genPositions();
    setAnimCards(pos.map(p => ({ ...p, alive: true })));
    setPhase("shuffling");

    timers.current.a = setTimeout(() => {
      setPhase("selecting");
      const kills = pos.map((_, i) => i * 35).reverse();
      setAnimCards(prev => prev.map((c, i) => ({ ...c, alive: i === selIdx, xd: i === selIdx ? 0 : kills[i] })));

      timers.current.a = setTimeout(() => {
        setAnimCards([]);
        setFinalVisible(true);
        setPhase("revealing");
        timers.current.a = setTimeout(() => setFlipped(true), 400);
        timers.current.a = setTimeout(() => setPhase("interpreting"), 1050);
      }, Math.max(...kills) + 350);
    }, 1800);
  }, [genPositions]);

  const handleDraw = async () => {
    if (!question.trim()) return;
    setError(""); setResult(null); setFlipped(false); setRevealText(""); setFinalVisible(false); setAnimCards([]);
    const { card, reversed } = pickCard();
    setResult({ card, reversed, interpretation: "" });
    runAnim(MAJOR_ARCANA.findIndex(c => c.id === card.id));

    try {
      const settings = getModelSettings();
      if (!settings.apiKey) { setTimeout(() => setError("请先在设置里填写 API Key"), 3500); return; }
      const prompt = `你是一位神秘的塔罗占卜师。不要用 emoji，中文回复，保持在 150 字以内，自然有诗意。

提问者的问题：「${question.trim()}」
抽到的牌：${card.name}${reversed ? "（逆位）" : "（正位）"}——${card.en}
牌面含义：${card.meaning}

请针对提问者的问题，解读这张牌的启示。提及牌面本身的意象，然后联系到提问者的处境。`;
      const resp = await callOpenAICompatible({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "你是塔罗占卜师，用诗意、温和的中文解牌。保持简洁，不超过 150 字。",
        settings,
      });
      const interp = resp?.text || "";
      setResult(prev => prev ? { ...prev, interpretation: interp } : null);
      if (interp) {
        let i = 0;
        timers.current.r = setInterval(() => { i++; setRevealText(interp.slice(0, i)); if (i >= interp.length) clearInterval(timers.current.r); }, 40);
      }
    } catch (err) { setTimeout(() => setError(err.message || "请求失败"), 3500); }
  };

  const reset = () => { setPhase("idle"); setResult(null); setRevealText(""); setFlipped(false); setFinalVisible(false); setAnimCards([]); setError(""); };

  const animKey = (phase === "shuffling" ? "sf" : phase === "selecting" ? "sl" : "");

  return (
    <div style={{ padding: "20px 16px", minHeight: "100%" }}>
      {/* Input */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>默想你的问题，然后写下它</label>
        <textarea value={question} onChange={e => setQuestion(e.target.value)} disabled={phase !== "idle"}
          placeholder="比如：我和 TA 的关系会如何发展？" rows={2}
          style={{ width: "100%", minWidth: 0, resize: "vertical", border: "1px solid var(--border-color)", borderRadius: 8, outline: 0, background: "var(--panel-bg)", color: "var(--text-main)", fontSize: 14, lineHeight: 1.7, padding: "10px 12px", fontFamily: "inherit", boxSizing: "border-box", opacity: phase !== "idle" ? 0.5 : 1 }} />
        <button onClick={handleDraw} disabled={phase !== "idle" || !question.trim()}
          style={{ marginTop: 10, width: "100%", padding: "10px 0", border: 0, borderRadius: 10, background: phase !== "idle" ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154,170,181,0.78))", color: "#fff", fontSize: 15, fontWeight: 500, cursor: phase !== "idle" || !question.trim() ? "default" : "pointer", fontFamily: "inherit", opacity: phase !== "idle" || !question.trim() ? 0.5 : 1 }}>
          {phase !== "idle" ? "解读中……" : "抽一张牌"}
        </button>
      </div>

      {/* Stage */}
      <div className="tst">
        {/* Shuffling / selecting */}
        {(phase === "shuffling" || phase === "selecting") && animCards.map((c, i) => (
          <div key={i} className={`tcd ${animKey}${phase === "selecting" && c.alive ? " al" : ""}`}
            style={{ left: c.x + "%", top: c.y + "%", "--r": c.rotate + "deg", "--s": String(c.scale), "--ex": ((Math.random() - 0.5) * 240) + "px", "--ey": ((Math.random() - 0.5) * 240) + "px", "--xd": (c.xd || 0) + "ms" }}>
            <div className="tcp"><div style={{ fontSize: 26, color: "rgba(180,155,130,0.5)", fontFamily: "serif" }}>{c.symbol}</div></div>
          </div>
        ))}

        {/* Final card */}
        {finalVisible && phase === "revealing" && (
          <div className="tfw">
            <div className={`tfi${flipped ? " fp" : ""}`}>
              <div className="tff">
                <div className="tfp">
                  <div style={{ fontSize: 11, color: "rgba(180,155,130,0.5)", fontFamily: "serif", letterSpacing: 3 }}>TAROT</div>
                  <div className="tfc"><div style={{ fontSize: 20, color: "rgba(180,155,130,0.55)", fontFamily: "serif" }}>✧</div></div>
                  <div style={{ fontSize: 10, color: "rgba(180,155,130,0.3)", fontFamily: "serif", letterSpacing: 2 }}>FATE</div>
                </div>
              </div>
              <div className="tfb">
                {result && <>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", fontFamily: "serif", marginBottom: 8, letterSpacing: 2 }}>{String(result.card.id).padStart(2, "0")}</div>
                  <div style={{ fontSize: 44, marginBottom: 6, transform: result.reversed ? "rotate(180deg)" : "none", transition: "transform 0.5s 0.4s", filter: "grayscale(0.3)" }}>☆</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-main)", textAlign: "center", lineHeight: 1.1 }}>{result.card.name}</div>
                  {result.reversed && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 4, fontWeight: 500 }}>逆 位</div>}
                  <div style={{ fontSize: 10, color: "var(--text-sub)", marginTop: 6, textAlign: "center", fontFamily: "serif", letterSpacing: 1 }}>{result.card.en}</div>
                </>}
              </div>
            </div>
          </div>
        )}

        {/* Interpretation */}
        {phase === "interpreting" && result && (
          <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,0)", width: "88%", maxWidth: 340 }}>
            <div style={{ textAlign: "center", marginBottom: 14, animation: "tu 0.6s ease-out forwards" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-main)" }}>{result.card.name}{result.reversed && <span style={{ fontSize: 14, color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>逆位</span>}</div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4, lineHeight: 1.5 }}>{result.card.meaning}</div>
            </div>
            {revealText && (
              <div style={{ padding: "16px", border: "1px solid var(--border-color)", borderRadius: 10, background: "var(--panel-bg)", fontSize: 14, lineHeight: 1.85, color: "var(--text-main)", whiteSpace: "pre-wrap", animation: "tu 0.4s ease-out forwards" }}>
                {revealText}{revealText.length < (result.interpretation?.length || 0) && <span style={{ display: "inline-block", width: 1, height: 17, background: "var(--text-main)", opacity: 0.35, marginLeft: 2, verticalAlign: "text-bottom" }} />}
              </div>
            )}
          </div>
        )}

        {error && phase === "interpreting" && (
          <div style={{ position: "absolute", left: "50%", top: "55%", transform: "translate(-50%,0)", textAlign: "center", fontSize: 13, color: "var(--danger)", animation: "tu 0.4s ease-out forwards" }}>{error}</div>
        )}
      </div>

      {/* Reset */}
      {phase === "interpreting" && result?.interpretation && revealText === result.interpretation && (
        <div style={{ textAlign: "center" }}>
          <button onClick={reset} style={{ border: "1px solid var(--border-color)", borderRadius: 8, background: "var(--panel-bg)", padding: "8px 24px", fontSize: 13, color: "var(--text-sub)", cursor: "pointer", fontFamily: "inherit" }}>再抽一张</button>
        </div>
      )}

      {/* Empty */}
      {phase === "idle" && !result && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-sub)", opacity: 0.5 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🃏</div>
          <div style={{ fontSize: 14 }}>写下问题，抽一张牌</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>命运会给你答案</div>
        </div>
      )}
    </div>
  );
}
