import { describe, it, expect } from "vitest";
import { findMatches, executeReplace, buildSearchRegex, escapeRegExp } from "./findReplaceUtils";
import { ExtractedText } from "@/types/manga";

describe("findReplaceUtils", () => {
  const mockImages = [
    { id: "img1", name: "ch01_001.png" },
    { id: "img2", name: "ch01_002.png" },
  ];

  const mockResults: Record<string, ExtractedText[]> = {
    img1: [
      {
        id: "b1",
        originalText: "Hello world!",
        translatedText: "مرحباً يا بطل، مرحباً بك في العالم",
        category: "dialogue",
      },
      {
        id: "b2",
        originalText: "Who are you?",
        translatedText: "من أنت يا جون؟",
        category: "dialogue",
      },
    ],
    img2: [
      {
        id: "b3",
        originalText: "John, look out!",
        translatedText: "احترس يا جون!",
        category: "dialogue",
      },
    ],
  };

  it("escapes special regex characters correctly", () => {
    expect(escapeRegExp("Hello (world) [SFX] ?")).toBe("Hello \\(world\\) \\[SFX\\] \\?");
  });

  it("finds all matches across multiple pages", () => {
    const matches = findMatches(
      mockImages,
      mockResults,
      { findText: "جون", replaceText: "يوهان" },
      "all",
    );

    expect(matches.length).toBe(2);
    expect(matches[0]?.imageId).toBe("img1");
    expect(matches[0]?.bubbleId).toBe("b2");
    expect(matches[1]?.imageId).toBe("img2");
    expect(matches[1]?.bubbleId).toBe("b3");
  });

  it("finds matches scoped to the current page only", () => {
    const matches = findMatches(
      mockImages,
      mockResults,
      { findText: "جون", replaceText: "يوهان" },
      "current",
      "img1",
    );

    expect(matches.length).toBe(1);
    expect(matches[0]?.bubbleId).toBe("b2");
  });

  it("replaces matches across all pages and returns accurate counts", () => {
    const { updatedMap, totalReplacements, affectedPages } = executeReplace(
      mockResults,
      { findText: "جون", replaceText: "يوهان" },
      "all",
    );

    expect(totalReplacements).toBe(2);
    expect(affectedPages).toBe(2);
    expect(updatedMap["img1"]![1]!.translatedText).toBe("من أنت يا يوهان؟");
    expect(updatedMap["img2"]![0]!.translatedText).toBe("احترس يا يوهان!");
  });

  it("supports replacing a specific bubble", () => {
    const { updatedMap, totalReplacements } = executeReplace(
      mockResults,
      { findText: "جون", replaceText: "يوهان" },
      "all",
      null,
      "b2",
    );

    expect(totalReplacements).toBe(1);
    expect(updatedMap["img1"]![1]!.translatedText).toBe("من أنت يا يوهان؟");
    // b3 on img2 should remain unchanged
    expect(updatedMap["img2"]![0]!.translatedText).toBe("احترس يا جون!");
  });

  it("handles case-insensitive English replacements", () => {
    const { updatedMap, totalReplacements } = executeReplace(
      mockResults,
      {
        findText: "john",
        replaceText: "Arthur",
        matchCase: false,
        targetField: "original",
      },
      "all",
    );

    expect(totalReplacements).toBe(1);
    expect(updatedMap["img2"]![0]!.originalText).toBe("Arthur, look out!");
  });

  it("respects whole word boundary for unicode/arabic", () => {
    const customResults: Record<string, ExtractedText[]> = {
      img1: [
        {
          id: "w1",
          originalText: "",
          translatedText: "ذهب علي إلى المدرسة، وعليا تلعب",
          category: "dialogue",
        },
      ],
    };

    const matchesWhole = findMatches([{ id: "img1", name: "test.png" }], customResults, {
      findText: "علي",
      replaceText: "عمر",
      matchWholeWord: true,
    });

    // "عليا" should NOT match "علي" when matchWholeWord is true!
    expect(matchesWhole.length).toBe(1);
    expect(matchesWhole[0]?.matchCount).toBe(1);

    const { updatedMap } = executeReplace(customResults, {
      findText: "علي",
      replaceText: "عمر",
      matchWholeWord: true,
    });

    expect(updatedMap["img1"]![0]!.translatedText).toBe("ذهب عمر إلى المدرسة، وعليا تلعب");
  });
});
