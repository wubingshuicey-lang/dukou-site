import { useState } from "react";
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

function pickCard() {
  const idx = Math.floor(Math.random() * MAJOR_ARCANA.length);
  const reversed = Math.random() < 0.5;
  return { card: MAJOR_ARCANA[idx], reversed };
}

function CardFace({ name, en, meaning, reversed }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "28px 20px",
      border: "1px solid var(--border-color)",
      borderRadius: 14,
      background: "var(--panel-bg)",
      maxWidth: 280,
      margin: "0 auto",
    }}>
      <div style={{
        fontSize: 48,
        marginBottom: 8,
        transform: reversed ? "rotate(180deg)" : "none",
        transition: "transform 0.4s",
      }}>
        {reversed ? "🃏" : "🃏"}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-main)" }}>
        {name}
        {reversed && "（逆位）"}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 4 }}>
        {en}{reversed ? " (Reversed)" : ""}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 10, lineHeight: 1.7 }}>
        {meaning}
      </div>
    </div>
  );
}

export default function TarotView() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDraw = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    const draw = pickCard();
    const { card, reversed } = draw;

    setResult({ card, reversed, interpretation: "" });

    try {
      const settings = getModelSettings();
      if (!settings.apiKey) {
        setError("请先在设置里填写 API Key");
        setLoading(false);
        return;
      }

      const prompt = `你是一位神秘的塔罗占卜师。不要用 emoji，中文回复，保持在 150 字以内，自然有诗意。

提问者的问题：「${question.trim()}」
抽到的牌：${card.name}${reversed ? "（逆位）" : "（正位）"}——${card.en}
牌面含义：${card.meaning}

请针对提问者的问题，解读者张牌的启示。提及牌面本身的意象，然后联系到提问者的处境。`;

      const response = await callOpenAICompatible({
        messages: [{ role: "user", content: prompt }],
        systemPrompt: "你是塔罗占卜师，用诗意、温和的中文解牌。保持简洁，不超过 150 字。",
        settings,
      });

      setResult({ card, reversed, interpretation: response?.text || "" });
    } catch (err) {
      setError(err.message || "请求失败");
      setResult({ card, reversed, interpretation: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 13, color: "var(--text-sub)", marginBottom: 8 }}>
          默想你的问题，然后写下它
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="比如：我和 TA 的关系会如何发展？"
          rows={2}
          style={{
            width: "100%",
            minWidth: 0,
            resize: "vertical",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            outline: 0,
            background: "var(--panel-bg)",
            color: "var(--text-main)",
            fontSize: 14,
            lineHeight: 1.7,
            padding: "10px 12px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleDraw}
          disabled={loading || !question.trim()}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "10px 0",
            border: 0,
            borderRadius: 10,
            background: loading ? "var(--text-sub)" : "linear-gradient(90deg, var(--accent-cold), rgba(154, 170, 181, 0.78))",
            color: "#fff",
            fontSize: 15,
            fontWeight: 500,
            cursor: loading || !question.trim() ? "default" : "pointer",
            fontFamily: "inherit",
            opacity: loading || !question.trim() ? 0.5 : 1,
          }}
        >
          {loading ? "解读中……" : "抽一张牌"}
        </button>
        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div>
          <CardFace
            name={result.card.name}
            en={result.card.en}
            meaning={result.card.meaning}
            reversed={result.reversed}
          />
          {result.interpretation && (
            <div style={{
              marginTop: 16,
              padding: "16px",
              border: "1px solid var(--border-color)",
              borderRadius: 10,
              background: "var(--panel-bg)",
              fontSize: 14,
              lineHeight: 1.85,
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
            }}>
              {result.interpretation}
            </div>
          )}
          {loading && !result.interpretation && (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-sub)", fontSize: 13 }}>
              正在聆听牌面的低语……
            </div>
          )}
        </div>
      )}
    </div>
  );
}
