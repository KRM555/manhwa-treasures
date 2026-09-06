export interface ImageItem {
  id: string;
  url: string;
  name: string;
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

export interface WorkspaceTab {
  id: string;
  name: string;
  images: ImageItem[];
  activeImageIndex: number;
  resultsMap: Record<string, ExtractedText[]>;
  selectedImageIds: string[];
  view: "upload" | "results";
  referenceText?: string;
  referenceFileName?: string;
  startPageNumber?: number;
  useFilenamePageNumber?: boolean;
  createdAt: number;
}
