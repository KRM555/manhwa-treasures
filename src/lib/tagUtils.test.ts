import { describe, it, expect } from "vitest";
import {
  parseTagRulesFromText,
  classifyTagDescription,
  exportTagsToText,
} from "./tagUtils";
import { TagRule } from "@/types/manga";

describe("Tag Rules Parsing and Classification (tagUtils)", () => {
  describe("classifyTagDescription", () => {
    it("classifies standard dialogue keywords", () => {
      expect(classifyTagDescription("حوار الشخصية")?.value).toBe("dialogue");
      expect(classifyTagDescription("Dialogue text")?.value).toBe("dialogue");
      expect(classifyTagDescription("كلام عادي")?.value).toBe("dialogue");
    });

    it("classifies thought keywords", () => {
      expect(classifyTagDescription("أفكار داخلية")?.value).toBe("thought");
      expect(classifyTagDescription("Inner monologue / thought")?.value).toBe("thought");
    });

    it("classifies scream and shout keywords", () => {
      expect(classifyTagDescription("صراخ البطل")?.value).toBe("scream");
      expect(classifyTagDescription("shout / scream")?.value).toBe("scream");
    });

    it("classifies system status screen keywords", () => {
      expect(classifyTagDescription("نافذة النظام / شاشة الحالة")?.value).toBe("system");
      expect(classifyTagDescription("System notification")?.value).toBe("system");
    });

    it("classifies phone, narrator, sfx, and whisper keywords", () => {
      expect(classifyTagDescription("مكالمة هاتف")?.value).toBe("phone");
      expect(classifyTagDescription("صوت الراوي / تعليق")?.value).toBe("narrator");
      expect(classifyTagDescription("مؤثرات صوتية SFX")?.value).toBe("sfx");
      expect(classifyTagDescription("همس خافت")?.value).toBe("whisper");
    });

    it("returns null for unknown or custom descriptions", () => {
      expect(classifyTagDescription("ملاحظات المترجم والمدقق")).toBeNull();
      expect(classifyTagDescription("عنوان الفصل")).toBeNull();
    });
  });

  describe("parseTagRulesFromText", () => {
    it("parses standard typer TXT file and classifies all standard tags", () => {
      const txtContent = `
# قائمة العلامات
"": حوار
(): أفكار
<>: صراخ
[]: نظام
**: هاتف
NA: راوي
sfx: مؤثر صوتي
ST: همس
`;

      const result = parseTagRulesFromText(txtContent);
      expect(result.totalParsed).toBe(8);
      expect(result.categorizedCount).toBe(8);
      expect(result.customCount).toBe(0);

      const dialogueTag = result.tags.find((t) => t.value === "dialogue");
      expect(dialogueTag).toBeDefined();
      expect(dialogueTag?.prefix).toBe('"": ');

      const thoughtTag = result.tags.find((t) => t.value === "thought");
      expect(thoughtTag).toBeDefined();
      expect(thoughtTag?.prefix).toBe("(): ");

      const systemTag = result.tags.find((t) => t.value === "system");
      expect(systemTag).toBeDefined();
      expect(systemTag?.prefix).toBe("[]: ");
    });

    it("parses reverse format (Description: Tag)", () => {
      const txt = `
حوار: ""
أفكار: ()
نظام: []
`;
      const result = parseTagRulesFromText(txt);
      expect(result.totalParsed).toBe(3);
      expect(result.tags.find((t) => t.value === "dialogue")).toBeDefined();
      expect(result.tags.find((t) => t.value === "thought")).toBeDefined();
    });

    it("parses explicit 3-part prefix | suffix | description", () => {
      const txt = `" | " | حوار
( | ) | أفكار`;
      const result = parseTagRulesFromText(txt);
      const dialogue = result.tags.find((t) => t.value === "dialogue");
      expect(dialogue).toBeDefined();
      expect(dialogue?.prefix).toBe('"');
      expect(dialogue?.suffix).toBe('"');
    });

    it("adds custom categories for non-standard tags", () => {
      const txt = `
"": حوار
##: ملاحظة المترجم
===: عنوان الفصل
`;
      const result = parseTagRulesFromText(txt);
      expect(result.totalParsed).toBe(3);
      expect(result.categorizedCount).toBe(1);
      expect(result.customCount).toBe(2);

      const customNote = result.tags.find((t) => t.label.includes("ملاحظة المترجم"));
      expect(customNote).toBeDefined();
      expect(customNote?.prefix).toBe("##: ");
    });

    it("ignores comments and blank lines safely", () => {
      const txt = `
# Comment line
// Another comment
; Semicolon comment

   
"": حوار
`;
      const result = parseTagRulesFromText(txt);
      expect(result.totalParsed).toBe(1);
      expect(result.tags.find((t) => t.value === "dialogue")).toBeDefined();
    });
  });

  describe("exportTagsToText", () => {
    it("exports current tag rules into a readable TXT string", () => {
      const sampleTags: TagRule[] = [
        { value: "dialogue", label: "حوار (Dialogue)", prefix: '"": ', suffix: "" },
        { value: "thought", label: "أفكار (Thought)", prefix: "(): ", suffix: "" },
      ];

      const exported = exportTagsToText(sampleTags);
      expect(exported).toContain('"": : حوار (Dialogue)');
      expect(exported).toContain("(): : أفكار (Thought)");

      // Test parsing back exported text
      const parsed = parseTagRulesFromText(exported);
      expect(parsed.totalParsed).toBe(2);
      expect(parsed.tags.find((t) => t.value === "dialogue")).toBeDefined();
    });
  });
});
