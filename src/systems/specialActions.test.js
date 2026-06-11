import { describe, it, expect } from "vitest";
import {
  stripSpecialTags,
  parseSpecialActions,
  splitToMessages,
  fallbackReplyFor,
} from "./specialActions.js";

// ============= stripSpecialTags =============

describe("stripSpecialTags", () => {
  it("removes <end_session> tag", () => {
    expect(stripSpecialTags("Hello<end_session>")).toBe("Hello");
    expect(stripSpecialTags("<end_session>World")).toBe("World");
    expect(stripSpecialTags("Hello<end_session>World")).toBe("HelloWorld");
  });

  it("removes <block_user> tag", () => {
    expect(stripSpecialTags("Bad user<block_user>")).toBe("Bad user");
  });

  it("removes <unblock_user> tag", () => {
    expect(stripSpecialTags("Good user<unblock_user>")).toBe("Good user");
  });

  it("removes <no_reply> tag", () => {
    expect(stripSpecialTags("No need to reply<no_reply>")).toBe("No need to reply");
  });

  it("removes <image>...</image> blocks including content", () => {
    expect(stripSpecialTags("Look<image>base64data</image>nice")).toBe("Looknice");
  });

  it("removes multiline <image> blocks", () => {
    // Regex removes <image>...</image> but leaves the trailing newline
    // before </image>, resulting in a blank line between Start and End
    expect(
      stripSpecialTags("Start\n<image>\nline1\nline2\n</image>\nEnd")
    ).toBe("Start\n\nEnd");
  });

  it("removes unclosed <image> tags at end of string", () => {
    expect(stripSpecialTags("Start<image>unclosed")).toBe("Start");
  });

  it("removes nested-like <image> tags (second <image> acts as terminator for first)", () => {
    // The regex alternation (?=<image>) stops at the next <image> start.
    // First pass: "<image>blah" removed. Second pass: "<image>Two" removed.
    // Result: only "One" remains.
    expect(stripSpecialTags("One<image>blah<image>Two")).toBe("One");
  });

  it("handles multiple special tags together", () => {
    expect(
      stripSpecialTags("Hello<end_session><block_user>World<no_reply>")
    ).toBe("HelloWorld");
  });

  it("returns empty string for only-tag input", () => {
    expect(stripSpecialTags("<end_session>")).toBe("");
    expect(stripSpecialTags("<no_reply>")).toBe("");
  });

  it("trims whitespace from result", () => {
    expect(stripSpecialTags("  Hello  ")).toBe("Hello");
  });

  it("handles undefined input", () => {
    expect(stripSpecialTags(undefined)).toBe("");
  });

  it("handles null input", () => {
    expect(stripSpecialTags(null)).toBe("");
  });

  it("handles numeric input", () => {
    expect(stripSpecialTags(42)).toBe("42");
  });

  it("handles empty string", () => {
    expect(stripSpecialTags("")).toBe("");
  });

  it("removes case-insensitive <image> tags (upper, mixed case)", () => {
    expect(stripSpecialTags("Before<IMAGE>data</IMAGE>After")).toBe("BeforeAfter");
    expect(stripSpecialTags("X<Image>d</Image>Y")).toBe("XY");
  });

  it("removes <image> without closing tag, not followed by another <image>", () => {
    expect(stripSpecialTags("Keep this<image>discard")).toBe("Keep this");
  });
});

// ============= parseSpecialActions =============

describe("parseSpecialActions", () => {
  it("returns clean text without any tags", () => {
    const result = parseSpecialActions("Hello World");
    expect(result.text).toBe("Hello World");
    expect(result.endSession).toBe(false);
    expect(result.blockUser).toBe(false);
    expect(result.unblockUser).toBe(false);
    expect(result.noReply).toBe(false);
  });

  it("detects endSession flag", () => {
    const result = parseSpecialActions("Goodbye<end_session>");
    expect(result.endSession).toBe(true);
    expect(result.text).toBe("Goodbye");
  });

  it("detects blockUser flag", () => {
    const result = parseSpecialActions("<block_user>You are blocked");
    expect(result.blockUser).toBe(true);
    expect(result.text).toBe("You are blocked");
  });

  it("detects unblockUser flag", () => {
    const result = parseSpecialActions("<unblock_user>Welcome back");
    expect(result.unblockUser).toBe(true);
    expect(result.text).toBe("Welcome back");
  });

  it("detects noReply flag", () => {
    const result = parseSpecialActions("<no_reply>Internal note");
    expect(result.noReply).toBe(true);
    expect(result.text).toBe("Internal note");
  });

  it("detects multiple flags simultaneously", () => {
    const result = parseSpecialActions(
      "Done<end_session><block_user><no_reply>"
    );
    expect(result.endSession).toBe(true);
    expect(result.blockUser).toBe(true);
    expect(result.noReply).toBe(true);
    expect(result.text).toBe("Done");
  });

  it("handles undefined input", () => {
    const result = parseSpecialActions(undefined);
    expect(result.text).toBe("");
    expect(result.endSession).toBe(false);
    expect(result.blockUser).toBe(false);
    expect(result.unblockUser).toBe(false);
    expect(result.noReply).toBe(false);
  });

  it("handles null input", () => {
    const result = parseSpecialActions(null);
    expect(result.text).toBe("");
  });

  it("handles empty string", () => {
    const result = parseSpecialActions("");
    expect(result.text).toBe("");
  });
});

// ============= splitToMessages =============

describe("splitToMessages", () => {
  it("returns empty array for empty input", () => {
    expect(splitToMessages("")).toEqual([]);
    expect(splitToMessages(null)).toEqual([]);
    expect(splitToMessages(undefined)).toEqual([]);
  });

  it("paragraph mode returns entire text as single element", () => {
    const text = "Line 1\nLine 2\nLine 3";
    expect(splitToMessages(text, "paragraph")).toEqual([text]);
  });

  it("paragraph mode strips special tags first", () => {
    const text = "Hello<end_session>World";
    expect(splitToMessages(text, "paragraph")).toEqual(["HelloWorld"]);
  });

  it("splits on <split> tags", () => {
    const result = splitToMessages("Part1<split>Part2<split>Part3");
    expect(result).toEqual(["Part1", "Part2", "Part3"]);
  });

  it("trims whitespace around <split> parts", () => {
    const result = splitToMessages("A <split> B <split> C ");
    expect(result).toEqual(["A", "B", "C"]);
  });

  it("filters out empty parts from <split>", () => {
    const result = splitToMessages("A<split><split>B");
    expect(result).toEqual(["A", "B"]);
  });

  it("splits on Chinese punctuation when no <split> present", () => {
    const result = splitToMessages("你好。世界！结束了吗？");
    expect(result).toEqual(["你好。", "世界！", "结束了吗？"]);
  });

  it("splits on newlines when no <split> or punctuation", () => {
    // \n is in the lookbehind class, so split occurs after \n,
    // but .trim() in .map() strips the trailing newlines
    const result = splitToMessages("Line1\nLine2\nLine3");
    expect(result).toEqual(["Line1", "Line2", "Line3"]);
  });

  it("splits on ellipsis", () => {
    const result = splitToMessages("Wait…What?");
    expect(result).toEqual(["Wait…", "What?"]);
  });

  it("returns single element when no splitting delimiters found", () => {
    const result = splitToMessages("Just one message");
    expect(result).toEqual(["Just one message"]);
  });

  it("<split> takes priority over punctuation splitting", () => {
    const result = splitToMessages("A。B<split>C。D");
    expect(result).toEqual(["A。B", "C。D"]);
  });

  it("strips special tags before splitting", () => {
    const result = splitToMessages("Hello<end_session>A<split>B. C。D");
    expect(result).toEqual(["HelloA", "B. C。D"]);
  });

  it("handles text with only special tags", () => {
    expect(splitToMessages("<end_session><no_reply>")).toEqual([]);
  });

  it("paragraph mode handles special tags and returns cleaned text", () => {
    const result = splitToMessages("<end_session>Keep this", "paragraph");
    expect(result).toEqual(["Keep this"]);
  });
});

// ============= fallbackReplyFor =============

describe("fallbackReplyFor", () => {
  it("returns settings-related reply for keywords like 设置/key/模型", () => {
    const result = fallbackReplyFor("怎么设置key");
    expect(result).toContain("设置页");
    expect(result).toContain("<split>");
  });

  it("returns emotional support reply for 累/难/崩/焦虑/害怕", () => {
    const result = fallbackReplyFor("我真的好累");
    expect(result).toContain("我在");
    expect(result).toContain("先别急着解释自己");
  });

  it("returns emotional support reply for 崩", () => {
    const result = fallbackReplyFor("心态崩了");
    expect(result).toContain("先别急着解释自己");
  });

  it("returns default reply for unrecognized input", () => {
    const result = fallbackReplyFor("今天天气不错");
    expect(result).toContain("我在");
    expect(result).toContain("你刚才那句我听见了");
  });

  it("settings pattern is case-insensitive", () => {
    const result = fallbackReplyFor("KEY在哪");
    expect(result).toContain("先把设置页填顺");
  });

  it("returns default for empty string", () => {
    const result = fallbackReplyFor("");
    expect(result).toContain("你刚才那句我听见了");
  });

  it("settings keywords take priority over emotional keywords", () => {
    const result = fallbackReplyFor("模型太难了");
    expect(result).toContain("先把设置页填顺");
  });
});
