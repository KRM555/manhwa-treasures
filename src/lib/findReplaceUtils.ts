import { ExtractedText } from "@/types/manga";

export interface ImageReference {
  id: string;
  name: string;
}

export interface FindReplaceOptions {
  findText: string;
  replaceText: string;
  matchCase?: boolean;
  matchWholeWord?: boolean;
  targetField?: "translated" | "original";
}

export interface FindMatch {
  imageId: string;
  imageName: string;
  pageIndex: number;
  bubbleId: string;
  bubbleIndex: number;
  originalText: string;
  translatedText: string;
  snippet: string;
  matchCount: number;
}

/**
 * Escapes characters with special meaning in Regular Expressions.
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a safe RegExp based on user search options.
 * Handles Unicode word boundaries safely for Arabic, Korean, Japanese, and English.
 */
export function buildSearchRegex(options: FindReplaceOptions): RegExp | null {
  const trimmed = options.findText;
  if (!trimmed) return null;

  const escaped = escapeRegExp(trimmed);
  let flags = "g";
  if (!options.matchCase) {
    flags += "i";
  }
  flags += "u";

  try {
    if (options.matchWholeWord) {
      // Use Unicode-aware word boundaries
      return new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escaped}(?=[^\\p{L}\\p{N}_]|$)`, flags);
    }
    return new RegExp(escaped, flags);
  } catch {
    // Fallback if lookbehind isn't supported
    return new RegExp(escaped, options.matchCase ? "g" : "gi");
  }
}

/**
 * Finds all occurrences across images and results.
 */
export function findMatches(
  images: ImageReference[],
  resultsMap: Record<string, ExtractedText[]>,
  options: FindReplaceOptions,
  scope: "all" | "current" = "all",
  activeImageId?: string | null,
): FindMatch[] {
  if (!options.findText.trim()) return [];

  const regex = buildSearchRegex(options);
  if (!regex) return [];

  const targetField = options.targetField || "translated";
  const matches: FindMatch[] = [];

  const targetImages =
    scope === "current" && activeImageId
      ? images.filter((img) => img.id === activeImageId)
      : images;

  targetImages.forEach((img, pageIdx) => {
    const bubbles = resultsMap[img.id] || [];
    bubbles.forEach((bubble, bubbleIdx) => {
      const textToSearch = targetField === "original" ? bubble.originalText : bubble.translatedText;
      if (!textToSearch) return;

      const found = textToSearch.match(regex);
      if (found && found.length > 0) {
        matches.push({
          imageId: img.id,
          imageName: img.name,
          pageIndex: pageIdx,
          bubbleId: bubble.id,
          bubbleIndex: bubbleIdx,
          originalText: bubble.originalText,
          translatedText: bubble.translatedText,
          snippet: textToSearch,
          matchCount: found.length,
        });
      }
    });
  });

  return matches;
}

/**
 * Replaces matched occurrences across the results map.
 */
export function executeReplace(
  resultsMap: Record<string, ExtractedText[]>,
  options: FindReplaceOptions,
  scope: "all" | "current" = "all",
  activeImageId?: string | null,
  specificBubbleId?: string,
): {
  updatedMap: Record<string, ExtractedText[]>;
  totalReplacements: number;
  affectedPages: number;
} {
  if (!options.findText) {
    return { updatedMap: resultsMap, totalReplacements: 0, affectedPages: 0 };
  }

  const regex = buildSearchRegex(options);
  if (!regex) {
    return { updatedMap: resultsMap, totalReplacements: 0, affectedPages: 0 };
  }

  const targetField = options.targetField || "translated";
  let totalReplacements = 0;
  let affectedPages = 0;
  const updatedMap: Record<string, ExtractedText[]> = {};

  const targetImageIds =
    scope === "current" && activeImageId ? [activeImageId] : Object.keys(resultsMap);

  for (const imgId of Object.keys(resultsMap)) {
    const list = resultsMap[imgId] || [];
    if (!targetImageIds.includes(imgId)) {
      updatedMap[imgId] = list;
      continue;
    }

    let pageHadReplacement = false;
    const newList = list.map((item) => {
      if (specificBubbleId && item.id !== specificBubbleId) {
        return item;
      }

      const currentText = targetField === "original" ? item.originalText : item.translatedText;
      if (!currentText) return item;

      const occurrences = (currentText.match(regex) || []).length;
      if (occurrences > 0) {
        totalReplacements += occurrences;
        pageHadReplacement = true;
        const newText = currentText.replace(regex, options.replaceText);
        return targetField === "original"
          ? { ...item, originalText: newText }
          : { ...item, translatedText: newText };
      }

      return item;
    });

    if (pageHadReplacement) {
      affectedPages++;
    }
    updatedMap[imgId] = newList;
  }

  return { updatedMap, totalReplacements, affectedPages };
}
