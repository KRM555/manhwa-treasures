import { describe, it, expect } from "vitest";
import { parseJsonFromResponse, sanitizeExtractedList } from "./geminiParser";

describe("Gemini JSON Parser (parseJsonFromResponse)", () => {
  it("parses valid direct JSON array", () => {
    const raw = JSON.stringify([
      {
        id: "b1",
        originalText: "Hello world",
        translatedText: "مرحبا بالعالم",
        category: "dialogue",
        topPercent: 15,
      },
    ]);

    const result = parseJsonFromResponse(raw);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]!.id).toBe("b1");
    expect(result![0]!.originalText).toBe("Hello world");
    expect(result![0]!.translatedText).toBe("مرحبا بالعالم");
    expect(result![0]!.category).toBe("dialogue");
    expect(result![0]!.topPercent).toBe(15);
  });

  it("extracts and parses JSON wrapped in ```json markdown codeblock", () => {
    const raw = `Here is the translated dialogue from the manga page:
\`\`\`json
[
  {
    "id": "item_1",
    "originalText": "Wait! Who are you?!",
    "translatedText": "انتظر! من أنت؟!",
    "category": "dialogue",
    "topPercent": 25
  },
  {
    "id": "item_2",
    "originalText": "He is fast...",
    "translatedText": "إنه سريع...",
    "category": "thought",
    "topPercent": 45
  }
]
\`\`\`
Hope this translation is helpful!`;

    const result = parseJsonFromResponse(raw);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0]!.originalText).toBe("Wait! Who are you?!");
    expect(result![1]!.category).toBe("thought");
  });

  it("extracts JSON wrapped in plain ``` codeblock without language tag", () => {
    const raw = `\`\`\`
[
  {
    "id": "bubble_1",
    "originalText": "BAM!",
    "translatedText": "بام!",
    "category": "sfx"
  }
]
\`\`\``;

    const result = parseJsonFromResponse(raw);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]!.category).toBe("sfx");
  });

  it("extracts JSON embedded inside surrounding text using bracket boundaries", () => {
    const raw = `Sure! I have analyzed the page. [
      {
        "originalText": "Let's go!",
        "translatedText": "لننطلق!",
        "category": "dialogue"
      }
    ] End of analysis.`;

    const result = parseJsonFromResponse(raw);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0]!.originalText).toBe("Let's go!");
    expect(result![0]!.translatedText).toBe("لننطلق!");
  });

  it("returns null for completely invalid or broken responses without throwing error", () => {
    expect(parseJsonFromResponse("")).toBeNull();
    expect(parseJsonFromResponse("   ")).toBeNull();
    expect(parseJsonFromResponse(null)).toBeNull();
    expect(parseJsonFromResponse(undefined)).toBeNull();
    expect(parseJsonFromResponse("Internal Server Error")).toBeNull();
    expect(parseJsonFromResponse('```json\n[{"incomplete": \n```')).toBeNull();
  });

  it("returns null when response is a JSON object rather than an array", () => {
    const raw = JSON.stringify({ error: "Rate limit exceeded" });
    expect(parseJsonFromResponse(raw)).toBeNull();
  });

  it("sanitizes missing fields properly", () => {
    const items = [
      {
        // missing id, missing category, missing topPercent
        originalText: "I am ready.",
        translatedText: "أنا مستعد.",
      },
    ];

    const sanitized = sanitizeExtractedList(items);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0]!.id).toBeDefined();
    expect(sanitized[0]!.category).toBe("dialogue");
    expect(typeof sanitized[0]!.topPercent).toBe("number");
    expect(sanitized[0]!.topPercent).toBeGreaterThanOrEqual(5);
  });
});
