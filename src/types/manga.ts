export interface DetectedBubble {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  originalText: string;
  translatedText: string;
  category: string;
}

export interface MangaPageItem {
  id: string;
  fileName: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
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