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

const TAROT_SYMBOLS = ["☉", "☽", "☆", "✧", "◈", "◆", "◇", "○", "△", "□", "♁", "♃", "♄", "♅", "♆", "♇", "☿", "♀", "♂", "♈", "♉", "♊"];

const CARD_W = 90;
const CARD_H = 136;
const FINAL_CARD_W = 140;
const FINAL_CARD_H = 210;
const STAGE_H = 440;

function pickCard() {
  const idx = Math.floor(Math.random() * MAJOR_ARCANA.length);
  const reversed = Math.random() < 0.5;
  return { card: MAJOR_ARCANA[idx], reversed };
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TarotView() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | shuffling | selecting | revealing | interpreting
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [animatingCards, setAnimatingCards] = useState([]);
  const [flipped, setFlipped] = useState(false);
  const [revealText, setRevealText] = useState("");
  const [finalVisible, setFinalVisible] = useState(false);
  const animTimerRef = useRef(null);
  const revealTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
    };
  }, []);

  const generateCardPositions = useCallback(() => {
    const seed = Date.now();
    const shuffled = seededShuffle(MAJOR_ARCANA, seed);
    const centerX = 50;
    const centerY = 42;
    const positions = shuffled.map((_, i) => {
      const angle = (i / shuffled.length) * Math.PI * 2 + (seed % 100) * 0.01;
      const radius = 28 + Math.random() * 30;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.65,
        rotate: (Math.random() - 0.5) * 70,
        scale: 0.7 + Math.random() * 0.35,
        delay: i * 25,
        symbol: TAROT_SYMBOLS[i % TAROT_SYMBOLS.length],
      };
    });
    return positions;
  }, []);

  const runAnimation = useCallback((selectedIdx) => {
    const positions = generateCardPositions();
    setAnimatingCards(positions.map((p, i) => ({ ...p, alive: true })));
    setPhase("shuffling");

    // Phase 1 → 2: shuffle visible then narrow down
    animTimerRef.current = setTimeout(() => {
      setPhase("selecting");

      const killTimeline = positions.map((_, i) => i * 35).reverse();

      setAnimatingCards((prev) =>
        prev.map((c, i) => ({
          ...c,
          alive: i === selectedIdx,
          exitDelay: i === selectedIdx ? 0 : killTimeline[i],
        }))
      );

      // Phase 3: final card fades in at center & flips
      animTimerRef.current = setTimeout(() => {
        setAnimatingCards([]);
        setFinalVisible(true);
        setPhase("revealing");

        animTimerRef.current = setTimeout(() => {
          setFlipped(true);

          animTimerRef.current = setTimeout(() => {
            setPhase("interpreting");
          }, 650);
        }, 400);
      }, Math.max(...killTimeline) + 350);
    }, 1800);
  }, [generateCardPositions]);

  const handleDraw = async () => {
    if (!question.trim()) return;
    setError("");
    setResult(null);
    setFlipped(false);
    setRevealText("");
    setFinalVisible(false);
    setAnimatingCards([]);

    const draw = pickCard();
    const { card, reversed } = draw;
    setResult({ card, reversed, interpretation: "" });

    const selectedIdx = MAJOR_ARCANA.findIndex((c) => c.id === card.id);
    runAnimation(selectedIdx);

    try {
      const settings = getModelSettings();
      if (!settings.apiKey) {
        setTimeout(() => setError("请先在设置里填写 API Key"), 3500);
        return;
      }

      const prompt = `你是一位神秘的塔罗占卜师。不要用 emoji，中文回复，保持在 150 字以内，自然有诗意。

提问者的问题：「${question.trim()}」
抽到的牌：${card.name}${reversed ? "（逆位）" : "（正位）"}——${card.en}
牌面含义：${card.meaning}

请针对提问者的问题，解读这张牌的启示。提及牌面本身的意象，然后联系到提问者的处境。`;

      const response = await callOpenAICompatible({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "你是塔罗占卜师，用诗意、温和的中文解牌。保持简洁，不超过 150 字。",
        settings,
      });

      const interpretation = response?.text || "";
      setResult((prev) => prev ? { ...prev, interpretation } : null);

      if (interpretation) {
        let idx = 0;
        revealTimerRef.current = setInterval(() => {
          idx++;
          setRevealText(interpretation.slice(0, idx));
          if (idx >= interpretation.length) {
            clearInterval(revealTimerRef.current);
          }
        }, 40);
      }
    } catch (err) {
      setTimeout(() => setError(err.message || "请求失败"), 3500);
    }
  };

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setRevealText("");
    setFlipped(false);
    setFinalVisible(false);
    setAnimatingCards([]);
    setError("");
  };

  return (
    <div style={{ padding: "20px 16px", minHeight: "100%" }}>
      <style>{`
        @keyframes t-float {
          0%, 100% { transform: translate(0, 0) rotate(var(--r)) scale(var(--s)); }
          25% { transform: translate(10px, -14px) rotate(calc(var(--r) + 6deg)) scale(calc(var(--s) + 0.04)); }
          50% { transform: translate(-6px, -3px) rotate(calc(var(--r) - 4deg)) scale(calc(var(--s) - 0.02)); }
          75% { transform: translate(8px, 10px) rotate(calc(var(--r) + 3deg)) scale(var(--s)); }
        }
        @keyframes t-exit {
          0% { opacity: 1; transform: translate(0, 0) rotate(var(--r)) scale(var(--s)); }
          100% { opacity: 0; transform: translate(var(--ex), var(--ey)) rotate(calc(var(--r) + 140deg)) scale(0.08); }
        }
        @keyframes t-appear {
          0% { opacity: 0; transform: translate(0, 0) rotate(var(--r)) scale(0.2); }
          100% { opacity: 1; transform: translate(0, 0) rotate(var(--r)) scale(var(--s)); }
        }
        @keyframes t-final-in {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(15deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
        }
        @keyframes t-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(140,120,100,0.2), 0 0 50px rgba(140,120,100,0.06); }
          50% { box-shadow: 0 0 35px rgba(160,140,110,0.35), 0 0 80px rgba(160,140,110,0.12); }
        }
        @keyframes t-text-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .t-stage {
          position: relative;
          width: 100%;
          height: ${STAGE_H}px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .t-card {
          position: absolute;
          width: ${CARD_W}px;
          height: ${CARD_H}px;
          border-radius: 10px;
          background: linear-gradient(145deg, #1c1c2e 0%, #1a2740 50%, #122544 100%);
          border: 2px solid rgba(160,142,120,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
          flex-shrink: 0;
        }
        .t-card.shuffling {
          animation: t-float 2.6s ease-in-out infinite;
        }
        .t-card.selecting:not(.alive) {
          animation: t-exit 0.65s ease-in forwards;
          animation-delay: var(--xd);
        }
        .t-card.appearing {
          animation: t-appear 0.35s ease-out forwards;
          animation-delay: var(--ad);
        }
        .t-card-pattern {
          width: 78%;
          height: 84%;
          border: 1.5px solid rgba(160,142,120,0.35);
          border-radius: 6px;
          background: repeating-linear-gradient(
            45deg, transparent, transparent 3px,
            rgba(160,142,120,0.06) 3px, rgba(160,142,120,0.06) 6px
          );
          display: grid;
          place-items: center;
        }
        .t-final-wrap {
          position: absolute;
          left: 50%;
          top: 42%;
          transform: translate(-50%, -50%);
          perspective: 1000px;
          animation: t-final-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .t-final-inner {
          position: relative;
          width: ${FINAL_CARD_W}px;
          height: ${FINAL_CARD_H}px;
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .t-final-inner.flipped {
          transform: rotateY(180deg);
        }
        .t-final-front,
        .t-final-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 14px;
        }
        .t-final-front {
          background: linear-gradient(145deg, #1c1c2e 0%, #1a2740 50%, #122544 100%);
          border: 2.5px solid rgba(160,142,120,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 40px rgba(0,0,0,0.3);
          animation: t-glow 2.5s ease-in-out infinite;
        }
        .t-final-front-pattern {
          width: 80%;
          height: 86%;
          border: 2px solid rgba(160,142,120,0.4);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: repeating-linear-gradient(
            45deg, transparent, transparent 4px,
            rgba(160,142,120,0.05) 4px, rgba(160,142,120,0.05) 8px
          );
        }
        .t-final-front-center {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid rgba(160,142,120,0.5);
          display: grid;
          place-items: center;
        }
        .t-final-back {
          transform: rotateY(180deg);
          background: var(--panel-bg);
          border: 1.5px solid var(--border-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 12px;
          box-sizing: border-box;
          box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        }
        .t-interp-wrap {
          position: absolute;
          left: 50%;
          top: ${STAGE_H * 0.58}%;
          transform: translate(-50%, 0);
          width: 88%;
          max-width: 340px;
        }
      `}</style>

      {/* === Input === */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>
          默想你的问题，然后写下它
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={phase !== "idle"}
          placeholder="比如：我和 TA 的关系会如何发展？"
          rows={2}
          style={{
            width: "100%", minWidth: 0, resize: "vertical",
            border: "1px solid var(--border-color)", borderRadius: 8, outline: 0,
            background: "var(--panel-bg)", color: "var(--text-main)",
            fontSize: 14, lineHeight: 1.7, padding: "10px 12px",
            fontFamily: "inherit", boxSizing: "border-box",
            opacity: phase !== "idle" ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleDraw}
          disabled={phase !== "idle" || !question.trim()}
          style={{
            marginTop: 10, width: "100%", padding: "10px 0", border: 0, borderRadius: 10,
            background: phase !== "idle"
              ? "var(--text-sub)"
              : "linear-gradient(90deg, var(--accent-cold), rgba(154,170,181,0.78))",
            color: "#fff", fontSize: 15, fontWeight: 500,
            cursor: phase !== "idle" || !question.trim() ? "default" : "pointer",
            fontFamily: "inherit",
            opacity: phase !== "idle" || !question.trim() ? 0.5 : 1,
          }}
        >
          {phase !== "idle" ? "解读中……" : "抽一张牌"}
        </button>
      </div>

      {/* === Animation stage === */}
      <div className="t-stage">
        {/* Shuffling / selecting cards */}
        {(phase === "shuffling" || phase === "selecting") &&
          animatingCards.map((c, i) => (
            <div
              key={i}
              className={`t-card ${phase}${phase === "selecting" && c.alive ? " alive" : ""}`}
              style={{
                left: `${c.x}%`, top: `${c.y}%`,
                "--r": `${c.rotate}deg`, "--s": String(c.scale),
                "--ex": `${(Math.random() - 0.5) * 240}px`,
                "--ey": `${(Math.random() - 0.5) * 240}px`,
                "--xd": `${c.exitDelay || 0}ms`,
              }}
            >
              <div className="t-card-pattern">
                <div style={{ fontSize: 26, color: "rgba(180,155,130,0.5)", fontFamily: "serif" }}>
                  {c.symbol}
                </div>
              </div>
            </div>
          ))}

        {/* Final card reveal */}
        {finalVisible && phase === "revealing" && (
          <div className="t-final-wrap">
            <div className={`t-final-inner${flipped ? " flipped" : ""}`}>
              {/* Back of card */}
              <div className="t-final-front">
                <div className="t-final-front-pattern">
                  <div style={{ fontSize: 11, color: "rgba(180,155,130,0.5)", fontFamily: "serif", letterSpacing: 3 }}>
                    TAROT
                  </div>
                  <div className="t-final-front-center">
                    <div style={{ fontSize: 20, color: "rgba(180,155,130,0.55)", fontFamily: "serif" }}>✧</div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(180,155,130,0.3)", fontFamily: "serif", letterSpacing: 2 }}>
                    FATE
                  </div>
                </div>
              </div>
              {/* Face of card */}
              <div className="t-final-back">
                {result && (
                  <>
                    <div style={{
                      fontSize: 12, color: "var(--text-sub)", fontFamily: "serif",
                      marginBottom: 8, letterSpacing: 2,
                    }}>
                      {String(result.card.id).padStart(2, "0")}
                    </div>
                    <div style={{
                      fontSize: 44, marginBottom: 6,
                      transform: result.reversed ? "rotate(180deg)" : "none",
                      transition: "transform 0.5s 0.4s",
                      filter: "grayscale(0.3)",
                    }}>
                      ☆
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 600, color: "var(--text-main)",
                      textAlign: "center", lineHeight: 1.1,
                    }}>
                      {result.card.name}
                    </div>
                    {result.reversed && (
                      <div style={{
                        fontSize: 12, color: "var(--danger, #c05050)", marginTop: 4, fontWeight: 500,
                      }}>
                        逆 位
                      </div>
                    )}
                    <div style={{
                      fontSize: 10, color: "var(--text-sub)", marginTop: 6,
                      textAlign: "center", fontFamily: "serif", letterSpacing: 1,
                    }}>
                      {result.card.en}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interpretation text */}
        {phase === "interpreting" && result && (
          <div className="t-interp-wrap">
            {/* Card header */}
            <div style={{ textAlign: "center", marginBottom: 14, animation: "t-text-up 0.6s ease-out forwards" }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-main)" }}>
                {result.card.name}
                {result.reversed && (
                  <span style={{ fontSize: 14, color: "var(--danger)", marginLeft: 8, fontWeight: 500 }}>
                    逆位
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4, lineHeight: 1.5 }}>
                {result.card.meaning}
              </div>
            </div>

            {revealText && (
              <div style={{
                padding: "16px", border: "1px solid var(--border-color)", borderRadius: 10,
                background: "var(--panel-bg)", fontSize: 14, lineHeight: 1.85,
                color: "var(--text-main)", whiteSpace: "pre-wrap",
                animation: "t-text-up 0.4s ease-out forwards",
              }}>
                {revealText}
                {revealText.length < (result.interpretation?.length || 0) && (
                  <span style={{
                    display: "inline-block", width: 1, height: 17,
                    background: "var(--text-main)", opacity: 0.35, marginLeft: 2,
                    verticalAlign: "text-bottom",
                  }} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && phase === "interpreting" && (
          <div style={{
            position: "absolute", left: "50%", top: "55%",
            transform: "translate(-50%, 0)", textAlign: "center",
            fontSize: 13, color: "var(--danger)",
            animation: "t-text-up 0.4s ease-out forwards",
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Redraw button */}
      {phase === "interpreting" && result?.interpretation && revealText === result.interpretation && (
        <div style={{ textAlign: "center" }}>
          <button
            onClick={reset}
            style={{
              border: "1px solid var(--border-color)", borderRadius: 8,
              background: "var(--panel-bg)", padding: "8px 24px",
              fontSize: 13, color: "var(--text-sub)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            再抽一张
          </button>
        </div>
      )}

      {/* Empty state */}
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
