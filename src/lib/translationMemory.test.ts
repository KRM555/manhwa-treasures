import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeText,
  saveToTranslationMemory,
  lookupTranslationMemory,
  clearTranslationMemory,
  getTranslationMemory,
} from "./translationMemory";

describe("Translation Memory (translationMemory)", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    // Mock global localStorage for Node test runner
    globalThis.localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
      length: 0,
      key: () => null,
    } as any;
  });

  it("normalizes text and collapses whitespace properly", () => {
    expect(normalizeText("   Hello    World   ")).toBe("hello world");
    expect(normalizeText("TEST", true)).toBe("TEST");
    expect(normalizeText("")).toBe("");
  });

  it("saves a new translation pair and retrieves it with lookup", () => {
    saveToTranslationMemory("Wait for me!", "انتظرني!", "ar", "dialogue");

    const { match } = lookupTranslationMemory("Wait for me!", "ar");
    expect(match).not.toBeNull();
    expect(match!.originalText).toBe("Wait for me!");
    expect(match!.translatedText).toBe("انتظرني!");
    expect(match!.targetLang).toBe("ar");
  });

  it("handles case-insensitive lookup by default", () => {
    saveToTranslationMemory("Who are you?", "من أنت؟", "ar");

    const { match } = lookupTranslationMemory("who are you?", "ar");
    expect(match).not.toBeNull();
    expect(match!.translatedText).toBe("من أنت؟");
  });

  it("increments frequency when the same translation is saved multiple times", () => {
    saveToTranslationMemory("Attack!", "هجوم!", "ar");
    saveToTranslationMemory("Attack!", "هجوم!", "ar");

    const memory = getTranslationMemory();
    expect(memory).toHaveLength(1);
    expect(memory[0]!.frequency).toBe(2);
  });

  it("isolates entries by target language", () => {
    saveToTranslationMemory("Good morning", "صباح الخير", "ar");

    const arMatch = lookupTranslationMemory("Good morning", "ar").match;
    const enMatch = lookupTranslationMemory("Good morning", "en").match;

    expect(arMatch).not.toBeNull();
    expect(enMatch).toBeNull();
  });

  it("clears all translation memory entries", () => {
    saveToTranslationMemory("One", "واحد", "ar");
    clearTranslationMemory();

    const memory = getTranslationMemory();
    expect(memory).toHaveLength(0);
  });
});
