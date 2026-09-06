import { describe, it, expect } from "vitest";
import { formatTextWithRules, buildScriptText } from "./exportUtils";
import { ExtractedText, TagRule } from "@/types/manga";

describe("Export Utilities (exportUtils)", () => {
  const sampleTags: TagRule[] = [
    { value: "dialogue", label: "حوار", prefix: '"', suffix: '":' },
    { value: "thought", label: "أفكار", prefix: "(", suffix: "):" },
    { value: "sfx", label: "مؤثرات", prefix: "[", suffix: "]:" },
    { value: "narration", label: "راوي", prefix: "{", suffix: "}:" },
  ];

  describe("formatTextWithRules", () => {
    it("wraps dialogue text with specified prefix and suffix", () => {
      const formatted = formatTextWithRules("مرحباً بك", "dialogue", sampleTags);
      expect(formatted).toBe('"مرحباً بك":');
    });

    it("wraps thought text with specified prefix and suffix", () => {
      const formatted = formatTextWithRules("ما الذي يحدث؟", "thought", sampleTags);
      expect(formatted).toBe("(ما الذي يحدث؟):");
    });

    it("returns clean trimmed text if no tag rule matches the category", () => {
      const formatted = formatTextWithRules("  نص غير مصنف  ", "unknown_category", sampleTags);
      expect(formatted).toBe("نص غير مصنف");
    });
  });

  describe("buildScriptText", () => {
    const sampleImages = [
      { id: "img1", name: "Page_01.png" },
      { id: "img2", name: "Page_02.png" },
    ];

    const sampleResults: Record<string, ExtractedText[]> = {
      img1: [
        {
          id: "b1",
          originalText: "Stop right there!",
          translatedText: "توقف مكانك!",
          category: "dialogue",
        },
        {
          id: "b2",
          originalText: "He is strong...",
          translatedText: "إنه قوي...",
          category: "thought",
        },
      ],
      img2: [
        {
          id: "b3",
          originalText: "BAM!",
          translatedText: "بام!",
          category: "sfx",
        },
      ],
    };

    it("builds a full translated script with page headers and tag formatting", () => {
      const script = buildScriptText({
        images: sampleImages,
        resultsMap: sampleResults,
        textType: "translated",
        tags: sampleTags,
        scope: "all",
      });

      expect(script).toContain("=== Page 1: Page_01.png ===");
      expect(script).toContain('"توقف مكانك!":');
      expect(script).toContain("(إنه قوي...):");
      expect(script).toContain("=== Page 2: Page_02.png ===");
      expect(script).toContain("[بام!]:");
    });

    it("builds original OCR text script when textType is 'original'", () => {
      const script = buildScriptText({
        images: sampleImages,
        resultsMap: sampleResults,
        textType: "original",
        tags: sampleTags,
        scope: "all",
      });

      expect(script).toContain('"Stop right there!":');
      expect(script).toContain("(He is strong...):");
      expect(script).not.toContain("توقف مكانك!");
    });

    it("exports only the active page when scope is 'current'", () => {
      const script = buildScriptText({
        images: sampleImages,
        resultsMap: sampleResults,
        textType: "translated",
        tags: sampleTags,
        scope: "current",
        currentImageId: "img2",
      });

      expect(script).not.toContain("=== Page 1: Page_01.png ===");
      expect(script).toContain("=== Page 2: Page_02.png ===");
      expect(script).toContain("[بام!]:");
    });

    it("returns empty string when there are no images or items", () => {
      const script = buildScriptText({
        images: [],
        resultsMap: {},
        textType: "translated",
        scope: "all",
      });
      expect(script).toBe("");
    });

    it("auto-detects page number from filename when useFilenamePageNumber is true", () => {
      const script = buildScriptText({
        images: [
          { id: "img11", name: "11.jpg" },
          { id: "img12", name: "12.png" },
        ],
        resultsMap: {
          img11: [
            { id: "t1", originalText: "Hello", translatedText: "مرحبا", category: "dialogue" },
          ],
          img12: [{ id: "t2", originalText: "Bye", translatedText: "وداعا", category: "dialogue" }],
        },
        textType: "translated",
        scope: "all",
        useFilenamePageNumber: true,
      });

      expect(script).toContain("=== Page 11: 11.jpg ===");
      expect(script).toContain("=== Page 12: 12.png ===");
    });

    it("respects startPageNumber when useFilenamePageNumber is false or no numbers in filename", () => {
      const script = buildScriptText({
        images: [
          { id: "imgA", name: "scene_alpha.jpg" },
          { id: "imgB", name: "scene_beta.jpg" },
        ],
        resultsMap: {
          imgA: [
            { id: "t1", originalText: "Hello", translatedText: "مرحبا", category: "dialogue" },
          ],
          imgB: [{ id: "t2", originalText: "Bye", translatedText: "وداعا", category: "dialogue" }],
        },
        textType: "translated",
        scope: "all",
        startPageNumber: 21,
        useFilenamePageNumber: false,
      });

      expect(script).toContain("=== Page 21: scene_alpha.jpg ===");
      expect(script).toContain("=== Page 22: scene_beta.jpg ===");
    });

    it("excludes SFX items when extractSFX is false", () => {
      const script = buildScriptText({
        images: sampleImages,
        resultsMap: sampleResults,
        textType: "translated",
        tags: sampleTags,
        scope: "all",
        extractSFX: false,
      });

      expect(script).toContain("=== Page 1: Page_01.png ===");
      expect(script).toContain('"توقف مكانك!":');
      expect(script).not.toContain("[بام!]:");
      expect(script).not.toContain("=== Page 2: Page_02.png ===");
    });
  });
});
