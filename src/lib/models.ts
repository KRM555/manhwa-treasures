import { GeminiModelMeta } from "@/types";

export const DEFAULT_GEMINI_MODELS: GeminiModelMeta[] = [
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    badge: "preview",
    description: "الأعلى ذكاءً وسياقاً للترجمة المعقدة والأدبية",
  },
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    badge: "preview",
    description: "سرعة خارقة مع فهم بصري فائق للمانهوا",
  },
  {
    id: "gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    badge: "preview",
    description: "متعدد الوسائط متوازن بين السرعة والدقة",
  },
  {
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    badge: "stable",
    description: "النموذج القياسي الأكثر استقراراً واعتمادية",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    badge: "stable",
    description: "فائق السرعة واقتصادي لاستهلاك الرموز",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    badge: "stable",
    description: "نموذج احتياطي فائق السرعة والموثوقية",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    badge: "stable",
    description: "نموذج مستقر للاستدلال والترجمة",
  },
];

// Fallback hierarchy per model
export const MODEL_FALLBACK_MAP: Record<string, string[]> = {
  "gemini-3.1-pro-preview": [
    "gemini-3.1-pro-preview",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
  ],
  "gemini-3.8-flash": [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
  ],
  "gemini-3.7-flash": [
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
  ],
  "gemini-3.6-flash": ["gemini-3.6-flash", "gemini-2.5-flash"],
  "gemini-3.5-flash-lite": ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash"],
  "gemini-2.5-flash": ["gemini-2.5-flash", "gemini-2.5-pro"],
  "gemini-2.5-pro": ["gemini-2.5-pro", "gemini-2.5-flash"],
};

/**
 * Checks if a specific model ID supports Gemini 3 thinking config.
 * When falling back to 2.5 or older models, thinkingConfig MUST be omitted
 * to avoid HTTP 400 parameter errors.
 */
export function doesModelSupportThinking(modelId: string): boolean {
  if (!modelId) return false;
  const clean = modelId.toLowerCase();
  // Only Gemini 3 models support thinkingConfig
  return clean.startsWith("gemini-3.") && !clean.includes("flash-lite");
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
