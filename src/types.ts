export type TermCategory = "character" | "location" | "skill" | "title" | "general";
export type TermScope = "global" | "chapter";

export interface GlossaryItem {
  id: string;
  original: string;
  translation: string;
  category: TermCategory;
  dontTranslate?: boolean;
  caseSensitive?: boolean;
  scope?: TermScope;
  targetLang?: "all" | "ar" | "en";
}

export interface TranslationMemoryEntry {
  id: string;
  originalText: string;
  translatedText: string;
  targetLang: "ar" | "en";
  category?: string;
  frequency: number;
  updatedAt: number;
}

export interface GeminiModelMeta {
  id: string;
  label: string;
  badge: "stable" | "preview";
  description?: string;
  isAvailable?: boolean;
}

export interface CustomTag {
  value: string;
  label: string;
  prefix: string;
  suffix: string;
}

export interface ExtractedItem {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
  topPercent: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  confidence?: number;
  fromTM?: boolean;
}

export interface ImageItem {
  id: string;
  url: string;
  name: string;
  data?: ExtractedItem[];
}

export type ProcessingMode = "ocr_and_translate" | "ocr_only";
