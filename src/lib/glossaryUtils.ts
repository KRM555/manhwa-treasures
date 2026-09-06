import { GlossaryItem, TermCategory } from "@/types";

export const GLOSSARY_CATEGORIES: Array<{
  value: TermCategory;
  labelAr: string;
  labelEn: string;
  badgeClass: string;
}> = [
  {
    value: "character",
    labelAr: "اسم شخصية",
    labelEn: "Character Name",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    value: "location",
    labelAr: "مكان / موقع",
    labelEn: "Location",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    value: "skill",
    labelAr: "مهارة / تقنية",
    labelEn: "Skill / Technique",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  {
    value: "title",
    labelAr: "لقب / منصب",
    labelEn: "Title / Honorific",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    value: "general",
    labelAr: "مصطلح عام",
    labelEn: "General Term",
    badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  },
];

/**
 * Formats the glossary into a clear structured JSON string with strict instructions
 * for Gemini to follow verbatim.
 */
export function formatGlossaryForPrompt(
  glossary: GlossaryItem[],
  targetLang: "ar" | "en",
  currentScopeOnly = false,
): string {
  if (!glossary || glossary.length === 0) return "";

  // Filter terms by language and scope
  const activeTerms = glossary.filter((item) => {
    if (item.targetLang && item.targetLang !== "all" && item.targetLang !== targetLang) {
      return false;
    }
    if (currentScopeOnly && item.scope === "chapter") {
      // In chapter scope, include it
      return true;
    }
    return true;
  });

  if (activeTerms.length === 0) return "";

  const structuredList = activeTerms.map((item) => ({
    original: item.original,
    approvedTranslation: item.translation,
    termType: item.category || "general",
    doNotTranslate: Boolean(item.dontTranslate),
    caseSensitive: Boolean(item.caseSensitive),
  }));

  return `
[STRICT GLOSSARY INSTRUCTION (JSON)]
You MUST strictly follow this glossary database for character names, techniques, titles, and locations.
If "doNotTranslate" is true, keep the exact original or designated approved transliteration without modifying it.
GLOSSARY DATA:
${JSON.stringify(structuredList, null, 2)}
`;
}

/**
 * Exports Glossary items to CSV format.
 */
export function exportGlossaryToCSV(items: GlossaryItem[]): string {
  const headers = [
    "original",
    "translation",
    "category",
    "dontTranslate",
    "caseSensitive",
    "scope",
    "targetLang",
  ];
  const rows = items.map((item) => [
    `"${(item.original || "").replace(/"/g, '""')}"`,
    `"${(item.translation || "").replace(/"/g, '""')}"`,
    item.category || "general",
    item.dontTranslate ? "true" : "false",
    item.caseSensitive ? "true" : "false",
    item.scope || "global",
    item.targetLang || "all",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Parses CSV text into Glossary items.
 */
export function parseGlossaryFromCSV(csvText: string): Partial<GlossaryItem>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const result: Partial<GlossaryItem>[] = [];
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser handling quotes
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        if (inQuotes && line[charIdx + 1] === '"') {
          current += '"';
          charIdx++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);

    const [original, translation, category, dontTranslate, caseSensitive, scope, targetLang] =
      values;
    if (original && (translation || dontTranslate === "true")) {
      result.push({
        id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        original: original.trim(),
        translation: (translation || original).trim(),
        category: (category as TermCategory) || "general",
        dontTranslate: dontTranslate === "true",
        caseSensitive: caseSensitive === "true",
        scope: scope === "chapter" ? "chapter" : "global",
        targetLang: (targetLang as "all" | "ar" | "en") || "all",
      });
    }
  }

  return result;
}
