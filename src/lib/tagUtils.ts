import { TagRule } from "@/types/manga";

export interface ParsedTagSummary {
  tags: TagRule[];
  totalParsed: number;
  categorizedCount: number;
  customCount: number;
}

interface CategoryMatch {
  value: string;
  defaultLabel: string;
}

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; value: string; defaultLabel: string }> = [
  {
    keywords: ["حوار", "dialogue", "كلام", "حديث", "speech"],
    value: "dialogue",
    defaultLabel: "حوار (Dialogue)",
  },
  {
    keywords: ["أفكار", "افكار", "فكر", "تفكير", "thought", "مونولوج", "داخلي"],
    value: "thought",
    defaultLabel: "أفكار (Thought)",
  },
  {
    keywords: ["صراخ", "صرخة", "scream", "shout", "عالي"],
    value: "scream",
    defaultLabel: "صراخ (Scream)",
  },
  {
    keywords: ["نظام", "شاشة", "system", "status", "نافذة", "مربع"],
    value: "system",
    defaultLabel: "نظام (System)",
  },
  {
    keywords: ["هاتف", "مكالمة", "اتصال", "phone", "رسالة", "call"],
    value: "phone",
    defaultLabel: "هاتف (Phone)",
  },
  {
    keywords: ["راوي", "سرد", "تعليق", "narrator", "narration", "صوت خارجي"],
    value: "narrator",
    defaultLabel: "راوي (Narrator)",
  },
  {
    keywords: ["مؤثر", "مؤثرات", "صوت", "sfx", "sound", "مؤثر صوتي"],
    value: "sfx",
    defaultLabel: "مؤثر صوتي (SFX)",
  },
  {
    keywords: ["همس", "whisper", "خافت", "بصوت منخفض"],
    value: "whisper",
    defaultLabel: "همس (Whisper)",
  },
];

/**
 * Detects category from a label or explanation string.
 */
export function classifyTagDescription(description: string): CategoryMatch | null {
  if (!description) return null;
  const norm = description.toLowerCase().trim();

  for (const item of CATEGORY_KEYWORDS) {
    if (item.keywords.some((kw) => norm.includes(kw.toLowerCase()))) {
      return { value: item.value, defaultLabel: item.defaultLabel };
    }
  }

  return null;
}

/**
 * Splits a line into raw tag part and raw explanation part.
 */
function splitTagLine(
  line: string,
): { rawTag: string; rawDescription: string; explicitSuffix?: string } | null {
  const cleanLine = line.trim();
  if (
    !cleanLine ||
    cleanLine.startsWith("# ") ||
    cleanLine.startsWith("//") ||
    cleanLine.startsWith(";") ||
    (cleanLine.startsWith("#") && !cleanLine.includes(":"))
  ) {
    return null;
  }

  // 1. Explicit 3-part format: "prefix | suffix | description"
  if (cleanLine.includes("|")) {
    const pipeParts = cleanLine.split("|").map((p) => p.trim());
    if (pipeParts.length >= 3) {
      return {
        rawTag: pipeParts[0] || "",
        explicitSuffix: pipeParts[1] || "",
        rawDescription: pipeParts.slice(2).join(" | "),
      };
    } else if (pipeParts.length === 2) {
      return {
        rawTag: pipeParts[0] || "",
        rawDescription: pipeParts[1] || "",
      };
    }
  }

  // 2. Colon delimiter: e.g. "": حوار or (): أفكار or حوار: "" or ===: عنوان
  if (cleanLine.includes(":")) {
    const firstColonIdx = cleanLine.indexOf(":");
    const beforeColon = cleanLine.substring(0, firstColonIdx).trim();
    const afterColon = cleanLine.substring(firstColonIdx + 1).trim();

    // Check if beforeColon is description (contains Arabic)
    const hasArabicBefore = /[\u0600-\u06FF]/.test(beforeColon);
    const hasArabicAfter = /[\u0600-\u06FF]/.test(afterColon);

    if (hasArabicBefore && !hasArabicAfter) {
      // "حوار: """ -> rawDescription is beforeColon, rawTag is afterColon
      return {
        rawTag: afterColon,
        rawDescription: beforeColon,
      };
    }

    // Otherwise standard "tag: description"
    return {
      rawTag: beforeColon,
      rawDescription: afterColon,
    };
  }

  // 3. Format with " = ", "->", ":=", " - ", " – "
  for (const sep of [" = ", "=", "->", ":=", " - ", " – "]) {
    if (cleanLine.includes(sep)) {
      const parts = cleanLine.split(sep);
      if (parts.length >= 2 && parts[0]!.trim() && parts[1]!.trim()) {
        return {
          rawTag: parts[0]!.trim(),
          rawDescription: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }

  // 4. Tab separated
  if (cleanLine.includes("\t")) {
    const tabParts = cleanLine.split("\t").map((p) => p.trim()).filter(Boolean);
    if (tabParts.length >= 2) {
      return {
        rawTag: tabParts[0]!,
        rawDescription: tabParts.slice(1).join(" "),
      };
    }
  }

  // 5. Space separated if tag is obvious symbol or acronym (e.g. '"" حوار' or '() أفكار')
  const spaceIdx = cleanLine.indexOf(" ");
  if (spaceIdx > 0) {
    const candidateTag = cleanLine.substring(0, spaceIdx).trim();
    const candidateDesc = cleanLine.substring(spaceIdx + 1).trim();
    if (candidateTag.length <= 6) {
      return {
        rawTag: candidateTag,
        rawDescription: candidateDesc,
      };
    }
  }

  return null;
}

/**
 * Normalizes prefix and suffix from rawTag string.
 */
function normalizePrefixSuffix(
  rawTag: string,
  explicitSuffix?: string,
): { prefix: string; suffix: string } {
  if (explicitSuffix !== undefined) {
    return { prefix: rawTag, suffix: explicitSuffix };
  }

  const trimmed = rawTag.trim();

  // Paired brackets with space/gap: e.g. " " or ( ) or [ ] or < > or { }
  if (trimmed === '" "' || trimmed === "“ ”") {
    return { prefix: '"', suffix: '"' };
  }
  if (trimmed === "( )") {
    return { prefix: "(", suffix: ")" };
  }
  if (trimmed === "[ ]") {
    return { prefix: "[", suffix: "]" };
  }
  if (trimmed === "< >") {
    return { prefix: "<", suffix: ">" };
  }
  if (trimmed === "{ }") {
    return { prefix: "{", suffix: "}" };
  }

  // Standard typer prefixes: ensure clean formatting e.g. '"": ' or '(): ' or 'NA: '
  if (trimmed.endsWith(":")) {
    return { prefix: `${trimmed} `, suffix: "" };
  }
  if (trimmed.endsWith(": ")) {
    return { prefix: trimmed, suffix: "" };
  }

  // If ends with standard symbols, append colon and space for typer script convention
  if (
    trimmed === '""' ||
    trimmed === "()" ||
    trimmed === "<>" ||
    trimmed === "[]" ||
    trimmed === "{}" ||
    trimmed === "**" ||
    trimmed === "##"
  ) {
    return { prefix: `${trimmed}: `, suffix: "" };
  }

  // For short text codes like 'NA', 'SFX', 'ST'
  if (/^[A-Za-z0-9]{1,4}$/.test(trimmed)) {
    return { prefix: `${trimmed}: `, suffix: "" };
  }

  return { prefix: trimmed ? `${trimmed} ` : "", suffix: "" };
}

/**
 * Parses a complete TXT string into structured TagRules, categorizing each.
 */
export function parseTagRulesFromText(
  fileContent: string,
  existingTags: TagRule[] = [],
): ParsedTagSummary {
  const lines = fileContent.split(/\r?\n/);
  const updatedTagsMap = new Map<string, TagRule>();

  // Initialize with existing tags
  existingTags.forEach((t) => {
    updatedTagsMap.set(t.value, { ...t });
  });

  let totalParsed = 0;
  let categorizedCount = 0;
  let customCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const parsedLine = splitTagLine(line);
    if (!parsedLine) continue;

    const { rawTag, rawDescription, explicitSuffix } = parsedLine;
    if (!rawTag && !rawDescription) continue;

    // Check classification
    const matchedCategory = classifyTagDescription(rawDescription) || classifyTagDescription(rawTag);
    const { prefix, suffix } = normalizePrefixSuffix(rawTag, explicitSuffix);

    if (matchedCategory) {
      // Known standard category: update or create
      const label = rawDescription.trim() || matchedCategory.defaultLabel;
      updatedTagsMap.set(matchedCategory.value, {
        value: matchedCategory.value,
        label,
        prefix,
        suffix,
      });
      categorizedCount++;
      totalParsed++;
    } else {
      // Custom category
      const customValue = `custom_${Date.now()}_${i}`;
      const label = rawDescription.trim() || rawTag.trim() || `علامة مخصصة ${i + 1}`;
      updatedTagsMap.set(customValue, {
        value: customValue,
        label,
        prefix,
        suffix,
      });
      customCount++;
      totalParsed++;
    }
  }

  return {
    tags: Array.from(updatedTagsMap.values()),
    totalParsed,
    categorizedCount,
    customCount,
  };
}

/**
 * Generates an editable TXT file content from the current tags.
 */
export function exportTagsToText(tags: TagRule[]): string {
  const lines: string[] = [
    "# ====================================================",
    "# Manga Typer Studio - ملف إعدادات وقواعد العلامات (Tags)",
    "# الصيغة المدعومة: العلامة : الشرح أو التصنيف",
    "# مثال:",
    "# \"\": حوار",
    "# (): أفكار",
    "# <>: صراخ",
    "# []: نظام",
    "# ====================================================",
    "",
  ];

  tags.forEach((tag) => {
    const symbol = tag.prefix ? tag.prefix.trim() : '""';
    lines.push(`${symbol} : ${tag.label}`);
  });

  return lines.join("\n");
}
