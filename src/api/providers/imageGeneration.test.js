import { describe, it, expect } from "vitest";
import { extractImage, normalizeBaseUrl } from "./imageGeneration.js";

// RED phase: write failing tests first. Since the functions already exist,
// these tests serve as regression/specification tests.

describe("normalizeBaseUrl", () => {
  it("returns URL unchanged when no trailing slashes", () => {
    expect(normalizeBaseUrl("https://api.example.com")).toBe("https://api.example.com");
  });

  it("removes a single trailing slash", () => {
    expect(normalizeBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
  });

  it("removes multiple trailing slashes", () => {
    expect(normalizeBaseUrl("https://api.example.com///")).toBe("https://api.example.com");
  });

  it("preserves slashes in the middle of the URL", () => {
    expect(normalizeBaseUrl("https://api.example.com/v1/")).toBe("https://api.example.com/v1");
  });

  it("handles URL with path and multiple trailing slashes", () => {
    expect(normalizeBaseUrl("https://api.example.com/v1/chat///")).toBe(
      "https://api.example.com/v1/chat"
    );
  });

  it("returns empty string unchanged", () => {
    expect(normalizeBaseUrl("")).toBe("");
  });

  it("handles URL with no protocol (just domain)", () => {
    expect(normalizeBaseUrl("localhost:8080/")).toBe("localhost:8080");
  });
});

describe("extractImage", () => {
  it("extracts URL from OpenAI format (data.data[0].url)", () => {
    const result = extractImage({
      data: [{ url: "https://example.com/img.png" }],
    });
    expect(result).toEqual({ type: "url", value: "https://example.com/img.png" });
  });

  it("extracts b64_json from OpenAI format (data.data[0].b64_json)", () => {
    const result = extractImage({
      data: [{ b64_json: "abc123base64" }],
    });
    expect(result).toEqual({ type: "b64", value: "abc123base64" });
  });

  it("extracts image from Volcengine/ByteDance format (data.generated_images[0].image)", () => {
    const result = extractImage({
      generated_images: [{ image: "base64fromVolc" }],
    });
    expect(result).toEqual({ type: "b64", value: "base64fromVolc" });
  });

  it("extracts image from camelCase variant (data.generatedImages[0].image)", () => {
    const result = extractImage({
      generatedImages: [{ image: "camelBase64" }],
    });
    expect(result).toEqual({ type: "b64", value: "camelBase64" });
  });

  it("extracts URL from camelCase variant (data.generatedImages[0].url)", () => {
    const result = extractImage({
      generatedImages: [{ url: "https://example.com/camel.png" }],
    });
    expect(result).toEqual({ type: "url", value: "https://example.com/camel.png" });
  });

  it("treats long strings as base64 (fallback for raw base64 responses)", () => {
    const longString = "a".repeat(101);
    const result = extractImage(longString);
    expect(result).toEqual({ type: "b64", value: longString });
  });

  it("returns null for short strings", () => {
    const result = extractImage("short");
    expect(result).toBeNull();
  });

  it("returns null for undefined input", () => {
    const result = extractImage(undefined);
    expect(result).toBeNull();
  });

  it("returns null for null input", () => {
    const result = extractImage(null);
    expect(result).toBeNull();
  });

  it("returns null for empty object", () => {
    const result = extractImage({});
    expect(result).toBeNull();
  });

  it("returns null for object with unrelated keys", () => {
    const result = extractImage({ foo: "bar" });
    expect(result).toBeNull();
  });

  it("prioritizes data.data[0].url over data.data[0].b64_json", () => {
    const result = extractImage({
      data: [{ url: "https://example.com/img.png", b64_json: "shouldBeIgnored" }],
    });
    expect(result).toEqual({ type: "url", value: "https://example.com/img.png" });
  });

  it("falls through to generated_images when data is empty array", () => {
    const result = extractImage({
      data: [],
      generated_images: [{ image: "fallbackBase64" }],
    });
    expect(result).toEqual({ type: "b64", value: "fallbackBase64" });
  });

  it("returns null for string of exactly 100 characters", () => {
    const result = extractImage("a".repeat(100));
    expect(result).toBeNull();
  });

  it("returns base64 for empty string (short, so null)", () => {
    const result = extractImage("");
    expect(result).toBeNull();
  });
});
