export interface DetectedBubble {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  topPercent?: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  confidence?: number;
  originalText: string;
  translatedText: string;
  category: string;
}

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
  topPercent?: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  confidence?: number;
  fromTM?: boolean;
}

export interface TagRule {
  value: string;
  label: string;
  prefix: string;
  suffix: string;
}

export interface MangaPageItem {
  id: string;
  fileName: string;
  previewUrl: string;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
  items: DetectedBubble[];
}

export interface TranslationConfig {
  targetLanguage: string;
  extractSFX: boolean;
  detectVerticalText: boolean;
}

export interface SampleManga {
  id: string;
  title: string;
  genre: string;
  thumbnail: string;
  fullImage: string;
  sampleBubbles: DetectedBubble[];
}
