import { ExtractedText } from "@/types/manga";

/**
 * Robustly parses Gemini LLM response into ExtractedText array.
 * Handles:
 * - Direct JSON array
 * - Markdown codeblocks (```json ... ``` or ``` ... ```)
 * - Leading/trailing text or explanations around the JSON array
 * - Malformed responses, empty strings, or null inputs
 */
export function parseJsonFromResponse(raw: string | null | undefined): ExtractedText[] | null {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return null;
  }

  const clean = raw.trim();

  // 1. Direct parse attempt
  try {
    const direct = JSON.parse(clean);
    if (Array.isArray(direct)) {
      return sanitizeExtractedList(direct);
    }
  } catch {
    // Continue to markdown or bracket extraction
  }

  // 2. Markdown fenced code block extraction
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const blockMatch = clean.match(codeBlockRegex);
  if (blockMatch && blockMatch[1]) {
    try {
      const parsed = JSON.parse(blockMatch[1].trim());
      if (Array.isArray(parsed)) {
        return sanitizeExtractedList(parsed);
      }
    } catch {
      // Continue to bracket search within block or original
    }
  }

  // 3. First '[' to last ']' substring extraction
  const firstBracket = clean.indexOf("[");
  const lastBracket = clean.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const extractedStr = clean.substring(firstBracket, lastBracket + 1);
      const parsed = JSON.parse(extractedStr);
      if (Array.isArray(parsed)) {
        return sanitizeExtractedList(parsed);
      }
    } catch {
      // Failed to parse
    }
  }

  return null;
}

/**
 * Validates and normalizes objects inside parsed array.
 */
export function sanitizeExtractedList(items: any[]): ExtractedText[] {
  return items
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const id =
        typeof item.id === "string" && item.id.trim()
          ? item.id
          : `bubble_${index + 1}_${Date.now()}`;
      const originalText = String(item.originalText ?? "").trim();
      const translatedText = String(item.translatedText ?? originalText).trim();
      const category = String(item.category ?? "dialogue").trim();
      const topPercent =
        typeof item.topPercent === "number" && !isNaN(item.topPercent)
          ? Math.min(100, Math.max(0, item.topPercent))
          : Math.min(95, Math.max(5, (index + 1) * 15));

      const leftPercent =
        typeof item.leftPercent === "number" && !isNaN(item.leftPercent)
          ? Math.min(100, Math.max(0, item.leftPercent))
          : undefined;

      const widthPercent =
        typeof item.widthPercent === "number" && !isNaN(item.widthPercent)
          ? Math.min(100, Math.max(1, item.widthPercent))
          : undefined;

      const heightPercent =
        typeof item.heightPercent === "number" && !isNaN(item.heightPercent)
          ? Math.min(100, Math.max(1, item.heightPercent))
          : undefined;

      const confidence =
        typeof item.confidence === "number" && !isNaN(item.confidence)
          ? Math.min(1, Math.max(0, Math.round(item.confidence * 100) / 100))
          : undefined;

      return {
        id,
        originalText,
        translatedText,
        category,
        topPercent,
        leftPercent,
        widthPercent,
        heightPercent,
        confidence,
        fromTM: Boolean(item.fromTM),
      };
    });
}
