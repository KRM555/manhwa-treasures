import { GeminiModelMeta } from "@/types";

export const DEFAULT_GEMINI_MODELS: GeminiModelMeta[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash (الموصى به ⚡)",
    badge: "vip",
    isVipOnly: false,
    description: "الأحدث والأسرع مع أعلى دقة بصرية في استخراج وترجمة المانهوا",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash (تفكير عميق 🧠)",
    badge: "vip",
    isVipOnly: true,
    description: "استدلال منطقي وسياقي متطور لفهم الحبكات والحوارات المعقدة (حصري VIP 👑)",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    badge: "stable",
    description: "النموذج القياسي الأكثر استقراراً واعتمادية لمختلف الاستخدامات",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    badge: "stable",
    description: "فائق السرعة واقتصادي لاستهلاك الرموز في الفصول الطويلة",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    badge: "vip",
    isVipOnly: true,
    description: "أعلى قدرة بلاغية وأدبية (مع تحويل تلقائي ذكي عند انشغال السيرفر) (حصري VIP 👑)",
  },
];

// Fallback hierarchy per model using only active, tested 200 OK models
export const MODEL_FALLBACK_MAP: Record<string, string[]> = {
  "gemini-3.1-pro-preview": [
    "gemini-3.1-pro-preview",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
  ],
  "gemini-3.8-flash": [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
  ],
  "gemini-3.7-flash": [
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
  ],
  "gemini-3.6-flash": ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"],
  "gemini-3.5-flash-lite": ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"],
};

/**
 * Checks if a specific model ID supports Gemini thinking config.
 */
export function doesModelSupportThinking(modelId: string): boolean {
  if (!modelId) return false;
  const clean = modelId.toLowerCase();
  return (
    clean.includes("3.6") ||
    clean.includes("3.7") ||
    clean.includes("3.8") ||
    clean.includes("3.1-pro")
  );
}

/**
 * Fetches the list of models supported by the provided API key directly from Google API.
 * Returns only models that support 'generateContent'.
 */
export async function fetchSupportedGeminiModels(apiKey: string): Promise<{
  allRemoteIds: string[];
  filteredModels: GeminiModelMeta[];
  error?: string;
}> {
  if (!apiKey) {
    return { allRemoteIds: [], filteredModels: DEFAULT_GEMINI_MODELS };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`,
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const msg = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return {
        allRemoteIds: [],
        filteredModels: DEFAULT_GEMINI_MODELS,
        error: msg,
      };
    }

    const data = await res.json();
    const rawModels: Array<{ name: string; supportedGenerationMethods?: string[] }> =
      data.models || [];

    // Filter to models that support content generation
    const contentModels = rawModels
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));

    const contentSet = new Set(contentModels);

    // Map our curated list with availability flag
    const mappedCurated = DEFAULT_GEMINI_MODELS.map((item) => {
      // Check if exact ID or prefixed version exists
      const isFound =
        contentSet.has(item.id) ||
        Array.from(contentSet).some((remoteId) => remoteId.includes(item.id));
      return {
        ...item,
        isAvailable: isFound,
      };
    });

    // We only keep models that are confirmed available, OR fallback to curated if list empty
    const availableOnly = mappedCurated.filter((m) => m.isAvailable !== false);

    return {
      allRemoteIds: contentModels,
      filteredModels: availableOnly.length > 0 ? availableOnly : mappedCurated,
    };
  } catch (err: any) {
    return {
      allRemoteIds: [],
      filteredModels: DEFAULT_GEMINI_MODELS,
      error: err.message,
    };
  }
}
