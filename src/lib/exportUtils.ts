import { ExtractedText, TagRule } from "@/types/manga";
import { extractPageNumber } from "./zipUtils";

export function formatTextWithRules(
  text: string,
  categoryVal: string,
  tags: TagRule[] = [],
): string {
  const cleanText = (text || "").trim();
  const rule = tags.find((t) => t.value === categoryVal);
  if (!rule) return cleanText;
  return `${rule.prefix}${cleanText}${rule.suffix}`;
}

export interface ScriptExportOptions {
  images: { id: string; name: string }[];
  resultsMap: Record<string, ExtractedText[]>;
  textType: "original" | "translated";
  tags?: TagRule[];
  scope: "current" | "all";
  currentImageId?: string;
  startPageNumber?: number;
  useFilenamePageNumber?: boolean;
}

export function buildScriptText(options: ScriptExportOptions): string {
  const {
    images,
    resultsMap,
    textType,
    tags = [],
    scope,
    currentImageId,
    startPageNumber = 1,
    useFilenamePageNumber = true,
  } = options;

  const targetImages =
    scope === "current" ? images.filter((img) => img.id === currentImageId) : images;

  if (targetImages.length === 0) return "";

  let fullOutput = "";

  targetImages.forEach((img) => {
    const realIndex = images.findIndex((i) => i.id === img.id);
    const itemsForImg = resultsMap[img.id] || [];
    if (itemsForImg.length > 0) {
      let pageNumberToDisplay: number = (startPageNumber || 1) + (realIndex >= 0 ? realIndex : 0);

      if (useFilenamePageNumber) {
        const detected = extractPageNumber(img.name);
        if (detected !== null && detected > 0) {
          pageNumberToDisplay = detected;
        }
      }

      fullOutput += `=== Page ${pageNumberToDisplay}: ${img.name} ===\n\n`;
      itemsForImg.forEach((item) => {
        const contentToExport = textType === "original" ? item.originalText : item.translatedText;
        fullOutput += formatTextWithRules(contentToExport, item.category, tags) + "\n\n";
      });
      fullOutput += "\n";
    }
  });

  return fullOutput;
}

