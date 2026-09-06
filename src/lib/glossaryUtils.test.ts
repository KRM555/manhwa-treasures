import { describe, it, expect } from "vitest";
import {
  formatGlossaryForPrompt,
  exportGlossaryToCSV,
  parseGlossaryFromCSV,
} from "./glossaryUtils";
import { GlossaryItem } from "@/types";

describe("Glossary Management (glossaryUtils)", () => {
  const sampleGlossary: GlossaryItem[] = [
    {
      id: "g1",
      original: "Sung Jin-Woo",
      translation: "سونغ جين-وو",
      category: "character",
      dontTranslate: false,
      caseSensitive: true,
      scope: "global",
      targetLang: "ar",
    },
    {
      id: "g2",
      original: "Shadow Monarch",
      translation: "عاهل الظلال",
      category: "title",
      dontTranslate: false,
      caseSensitive: false,
      scope: "global",
      targetLang: "ar",
    },
    {
      id: "g3",
      original: "Mana",
      translation: "Mana",
      category: "general",
      dontTranslate: true,
      caseSensitive: false,
      scope: "global",
      targetLang: "all",
    },
  ];

  describe("formatGlossaryForPrompt", () => {
    it("returns empty string when glossary is empty", () => {
      expect(formatGlossaryForPrompt([], "ar")).toBe("");
    });

    it("formats glossary items into structured JSON instruction block", () => {
      const prompt = formatGlossaryForPrompt(sampleGlossary, "ar");
      expect(prompt).toContain("[STRICT GLOSSARY INSTRUCTION (JSON)]");
      expect(prompt).toContain("Sung Jin-Woo");
      expect(prompt).toContain("سونغ جين-وو");
      expect(prompt).toContain("Mana");
      expect(prompt).toContain('"doNotTranslate": true');
    });

    it("filters out terms designated for other target languages", () => {
      const promptEn = formatGlossaryForPrompt(sampleGlossary, "en");
      // g1 is targetLang: 'ar', so when targetLang is 'en', it should be excluded
      expect(promptEn).not.toContain("سونغ جين-وو");
      // g3 is targetLang: 'all', so it should still be included
      expect(promptEn).toContain("Mana");
    });
  });

  describe("CSV Export and Import (Round-trip)", () => {
    it("exports glossary items to valid CSV string", () => {
      const csv = exportGlossaryToCSV(sampleGlossary);
      expect(csv).toContain(
        "original,translation,category,dontTranslate,caseSensitive,scope,targetLang",
      );
      expect(csv).toContain('"Sung Jin-Woo","سونغ جين-وو",character,false,true,global,ar');
      expect(csv).toContain('"Mana","Mana",general,true,false,global,all');
    });

    it("parses exported CSV back into glossary items correctly", () => {
      const csv = exportGlossaryToCSV(sampleGlossary);
      const parsed = parseGlossaryFromCSV(csv);

      expect(parsed).toHaveLength(3);
      expect(parsed[0]!.original).toBe("Sung Jin-Woo");
      expect(parsed[0]!.translation).toBe("سونغ جين-وو");
      expect(parsed[0]!.category).toBe("character");
      expect(parsed[0]!.caseSensitive).toBe(true);
      expect(parsed[2]!.dontTranslate).toBe(true);
    });

    it("handles commas and escaped quotes inside original or translation terms", () => {
      const complexGlossary: GlossaryItem[] = [
        {
          id: "g_quotes",
          original: 'Item with "Quotes", and comma',
          translation: 'عنصر مع "علامات تنصيص"، وفواصل',
          category: "general",
        },
      ];

      const csv = exportGlossaryToCSV(complexGlossary);
      const parsed = parseGlossaryFromCSV(csv);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]!.original).toBe('Item with "Quotes", and comma');
      expect(parsed[0]!.translation).toBe('عنصر مع "علامات تنصيص"، وفواصل');
    });
  });
});
