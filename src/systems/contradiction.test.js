import { describe, it, expect } from "vitest";

// ============================================================
// 🔴 RED 阶段 — 导入会失败（文件还没创建）
// ============================================================

import {
  hasNegationFlip,
  detectContradictionCandidate,
  cosineSimilarity,
} from "./contradiction.js";

// ============= cosineSimilarity =============

describe("cosineSimilarity（向量余弦相似度）", () => {
  it("相同向量返回 1", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("正交向量返回 0", () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it("长度不等的向量返回 0", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("空向量返回 0", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

// ============= hasNegationFlip =============

describe("hasNegationFlip（否定翻转检测）", () => {
  it("新文本有否定词，旧文本没有 → 矛盾", () => {
    expect(hasNegationFlip("我绝对不吃辣", "我喜欢吃辣")).toBe(true);
  });

  it("旧文本有否定词，新文本没有 → 矛盾", () => {
    expect(hasNegationFlip("川菜好吃", "我从不吃辣")).toBe(true);
  });

  it("两个都有否定词 → 不矛盾", () => {
    expect(hasNegationFlip("我绝对不吃辣", "我不吃辣")).toBe(false);
  });

  it("两个都没有否定词 → 不矛盾", () => {
    expect(hasNegationFlip("猫很可爱", "我喜欢猫")).toBe(false);
  });

  it("新文本有 '再也不'，旧文本没有否定词 → 矛盾", () => {
    expect(hasNegationFlip("我再也不抽烟了", "我喜欢抽烟")).toBe(true);
  });

  it("否定词 '没' 检测", () => {
    expect(hasNegationFlip("我没吃过", "我吃过")).toBe(true);
  });

  it("否定词 '别' 检测", () => {
    expect(hasNegationFlip("别去那家", "去那家")).toBe(true);
  });

  it("否定词 '从不' 检测", () => {
    expect(hasNegationFlip("我从不去", "我去")).toBe(true);
  });

  it("否定词 '绝不' 检测", () => {
    expect(hasNegationFlip("我绝不吃", "我吃")).toBe(true);
  });

  it("空文本不崩溃", () => {
    expect(hasNegationFlip("", "测试")).toBe(false);
    expect(hasNegationFlip("测试", "")).toBe(false);
    expect(hasNegationFlip("", "")).toBe(false);
  });
});

// ============= detectContradictionCandidate =============

describe("detectContradictionCandidate（矛盾候选检测）", () => {
  // 模拟向量（3维，方便测试）
  const spicyPos = [0.1, 0.2, 0.9];   // 喜欢辣
  const spicyNeg = [0.1, 0.21, 0.88]; // 不喜欢辣（语义相近）
  const catLike = [0.5, 0.8, 0.1];    // 猫
  const runDaily = [0.3, 0.4, 0.5];   // 跑步
  const swimLike = [0.99, 0.01, 0.01]; // 游泳（完全不同）

  const oldMemories = [
    { id: "1", text: "用户喜欢吃辣", embedding: JSON.stringify(spicyPos), created_at: "2026-03-01" },
    { id: "2", text: "用户养了一只猫", embedding: JSON.stringify(catLike), created_at: "2026-05-01" },
    { id: "3", text: "用户每天跑步", embedding: JSON.stringify(runDaily), created_at: "2026-04-01" },
    { id: "4", text: "用户不吃辣", embedding: JSON.stringify(spicyNeg), created_at: "2026-06-01" },
  ];

  it("新记忆与语义相近的旧记忆有否定翻转 → 返回矛盾", () => {
    const result = detectContradictionCandidate(
      "我最近开始吃辣了", JSON.stringify([0.12, 0.21, 0.88]), oldMemories
    );
    expect(result).not.toBeNull();
    expect(result.contradictedId).toBe("4");
    expect(result.reason).toContain("negation_flip");
  });

  it("新记忆和所有旧记忆语义都不接近 → 返回 null", () => {
    const result = detectContradictionCandidate(
      "我喜欢游泳", JSON.stringify(swimLike), oldMemories
    );
    expect(result).toBeNull();
  });

  it("旧记忆已 archived 的不参与检测", () => {
    const memsWithArchived = [
      ...oldMemories,
      { id: "5", text: "用户爱吃火锅", embedding: JSON.stringify(spicyPos), created_at: "2026-02-01", archived: 1 },
    ];
    const result = detectContradictionCandidate(
      "我讨厌火锅了", JSON.stringify(spicyNeg), memsWithArchived
    );
    // archived=1 的记忆不参与 → 应该匹配到 id:1（喜欢辣）或 id:4
    if (result) {
      expect(result.contradictedId).not.toBe("5"); // archived 的不该被匹配
    }
  });

  it("新记忆无嵌入 → 返回 null", () => {
    const result = detectContradictionCandidate("测试文本", null, oldMemories);
    expect(result).toBeNull();
  });

  it("空记忆列表 → 返回 null", () => {
    const result = detectContradictionCandidate("测试", JSON.stringify([0.5, 0.5, 0.5]), []);
    expect(result).toBeNull();
  });
});

// ============= 集成场景 =============

describe("矛盾检测 — 集成场景", () => {
  it("场景：不吃肉 → 吃牛排", () => {
    const noMeatVec = JSON.stringify([0.8, 0.1, 0.1]);
    const meatVec = JSON.stringify([0.81, 0.09, 0.11]); // 语义接近
    const mems = [
      { id: "v1", text: "用户从来不吃肉", embedding: noMeatVec, created_at: "2026-03-01" },
    ];
    const result = detectContradictionCandidate(
      "我今天吃了牛排，太好吃了", meatVec, mems
    );
    expect(result).not.toBeNull();
    expect(result.contradictedId).toBe("v1");
  });

  it("场景：讨厌 → 觉得不错", () => {
    const hateVec = JSON.stringify([0.2, 0.7, 0.1]);
    const likeVec = JSON.stringify([0.21, 0.71, 0.09]);
    const mems = [
      { id: "h1", text: "用户讨厌小王", embedding: hateVec, created_at: "2026-04-01" },
    ];
    const result = detectContradictionCandidate(
      "小王今天帮了我，我觉得他人不错", likeVec, mems
    );
    expect(result).not.toBeNull();
  });

  it("场景：正常补充，不矛盾", () => {
    const catVec = JSON.stringify([0.5, 0.8, 0.1]);
    const catVec2 = JSON.stringify([0.51, 0.79, 0.12]);
    const mems = [
      { id: "c1", text: "用户喜欢猫", embedding: catVec, created_at: "2026-05-01" },
    ];
    const result = detectContradictionCandidate(
      "用户又领养了一只猫", catVec2, mems
    );
    expect(result).toBeNull();
  });

  it("场景：同一天反复说同样的话 → 不矛盾", () => {
    const vec = JSON.stringify([0.3, 0.5, 0.7]);
    const mems = [
      { id: "r1", text: "我不吃辣", embedding: vec, created_at: "2026-06-12 10:00:00" },
    ];
    const result = detectContradictionCandidate(
      "我真的不吃辣", vec, mems
    );
    expect(result).toBeNull();
  });
});
