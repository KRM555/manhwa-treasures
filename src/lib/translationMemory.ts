import { TranslationMemoryEntry } from "@/types";

const TM_STORAGE_KEY = "manga_translation_memory_v1";

/**
 * Normalizes text for matching in Translation Memory.
 */
export function normalizeText(text: string, caseSensitive = false): string {
  if (!text) return "";
  let norm = text.trim();
  if (!caseSensitive) {
    norm = norm.toLowerCase();
  }
  // normalize excessive whitespace
  return norm.replace(/\s+/g, " ");
}

/**
 * Retrieves all stored Translation Memory entries from localStorage.
 */
export function getTranslationMemory(): TranslationMemoryEntry[] {
  try {
    const raw = localStorage.getItem(TM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load translation memory:", err);
    return [];
  }
}

/**
 * Saves a translation pair to Translation Memory.
 * If the exact original text exists for the given language, increments frequency and updates.
 */
export function saveToTranslationMemory(
  originalText: string,
  translatedText: string,
  targetLang: "ar" | "en",
  category?: string,
): void {
  const normOriginal = normalizeText(originalText);
  if (!normOriginal || !translatedText.trim()) return;

  try {
    const memory = getTranslationMemory();
    const existingIndex = memory.findIndex(
      (m) => normalizeText(m.originalText) === normOriginal && m.targetLang === targetLang,
    );

    if (existingIndex >= 0) {
      memory[existingIndex] = {
        ...memory[existingIndex],
        translatedText: translatedText.trim(),
        category: category || memory[existingIndex].category,
        frequency: (memory[existingIndex].frequency || 1) + 1,
        updatedAt: Date.now(),
      };
    } else {
      const newEntry: TranslationMemoryEntry = {
        id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        originalText: originalText.trim(),
        translatedText: translatedText.trim(),
        targetLang,
        category,
        frequency: 1,
        updatedAt: Date.now(),
      };
      // Keep memory bounded to reasonable limit (e.g. 2000 entries)
      if (memory.length >= 2000) {
        memory.sort((a, b) => a.frequency - b.frequency);
        memory.shift();
      }
      memory.push(newEntry);
    }

    localStorage.setItem(TM_STORAGE_KEY, JSON.stringify(memory));
  } catch (err) {
    console.error("Failed to save to translation memory:", err);
  }
}

/**
 * Looks up a match in the Translation Memory.
 */
export function lookupTranslationMemory(
  originalText: string,
  targetLang: "ar" | "en",
  caseSensitive = false,
): { match: TranslationMemoryEntry | null } {
  const normTarget = normalizeText(originalText, caseSensitive);
  if (!normTarget) return { match: null };

  const memory = getTranslationMemory();
  const match = memory.find((entry) => {
    if (entry.targetLang !== targetLang) return false;
    const normStored = normalizeText(entry.originalText, caseSensitive);
    return normStored === normTarget;
  });

  return { match: match || null };
}

/**
 * Clears all entries in the Translation Memory.
 */
export function clearTranslationMemory(): void {
  try {
    localStorage.removeItem(TM_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear translation memory:", err);
  }
}

/**
 * Deletes a single entry from Translation Memory by ID.
 */
export function deleteTranslationMemoryEntry(id: string): void {
  try {
    const memory = getTranslationMemory().filter((m) => m.id !== id);
    localStorage.setItem(TM_STORAGE_KEY, JSON.stringify(memory));
  } catch (err) {
    console.error("Failed to delete TM entry:", err);
  }
}
