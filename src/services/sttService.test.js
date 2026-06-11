import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { supportsSTT } from "./sttService.js";

describe("supportsSTT", () => {
  // Save original navigator and window to restore after tests
  let originalNavigator;
  let originalWindow;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    globalThis.navigator = originalNavigator;
    globalThis.window = originalWindow;
  });

  it("returns true when MediaRecorder is available", () => {
    globalThis.navigator = {
      mediaDevices: { getUserMedia: () => {} },
    };
    globalThis.window = {
      MediaRecorder: class {},
    };
    expect(supportsSTT()).toBe(true);
  });

  it("returns true when SpeechRecognition is available", () => {
    globalThis.navigator = {};
    globalThis.window = {
      SpeechRecognition: class {},
    };
    expect(supportsSTT()).toBe(true);
  });

  it("returns true when webkitSpeechRecognition is available", () => {
    globalThis.navigator = {};
    globalThis.window = {
      webkitSpeechRecognition: class {},
    };
    expect(supportsSTT()).toBe(true);
  });

  it("returns false when neither MediaRecorder nor SpeechRecognition is available", () => {
    globalThis.navigator = {};
    globalThis.window = {};
    expect(supportsSTT()).toBe(false);
  });

  it("returns false when navigator exists but has no mediaDevices", () => {
    globalThis.navigator = {};
    globalThis.window = {};
    expect(supportsSTT()).toBe(false);
  });

  it("returns false when mediaDevices exists but has no getUserMedia", () => {
    globalThis.navigator = {
      mediaDevices: {},
    };
    globalThis.window = {};
    expect(supportsSTT()).toBe(false);
  });

  it("returns true when both MediaRecorder AND SpeechRecognition are available", () => {
    globalThis.navigator = {
      mediaDevices: { getUserMedia: () => {} },
    };
    globalThis.window = {
      MediaRecorder: class {},
      SpeechRecognition: class {},
      webkitSpeechRecognition: class {},
    };
    expect(supportsSTT()).toBe(true);
  });
});
