import { BubbleData } from "@/types";

export interface PolishedBubbleResult {
  id: string;
  originalText?: string;
  oldText: string;
  polishedText: string;
  notes?: string;
}

export async function proofreadTranslationsWithAI({
  bubbles,
  apiKey,
  model = "gemini-3.8-flash",
  genreContext = "manhwa / manga dialogue",
}: {
  bubbles: BubbleData[];
  apiKey: string;
  model?: string;
  genreContext?: string;
}): Promise<{
  results: PolishedBubbleResult[];
  error?: string;
}> {
  if (!apiKey) {
    return { results: [], error: "Gemini API key is required" };
  }

  const validBubbles = bubbles.filter(
    (b) => b.translatedText && b.translatedText.trim().length > 0,
  );
  if (validBubbles.length === 0) {
    return { results: [], error: "No translated text to proofread" };
  }

  const promptInput = validBubbles.map((b) => ({
    id: b.id,
    original: b.originalText || "",
    currentTranslation: b.translatedText,
    category: b.category || "dialogue",
  }));

  const systemInstruction = `أنت كبير محرري ومراجعي ترجمة المانجا والمانهوا باللغة العربية الفصحى (Senior Manga/Manhwa Arabic Editor & Proofreader).
مهمتك:
1. التدقيق اللغوي والنحوي والإملائي الدقيق لترجمات الفقاعات المرفقة.
2. تحسين الصياغة الأدبية والبلاغة وجعل الحوار طبيعياً، جذاباً، ومعبراً يتناسب مع نوع العمل (${genreContext}).
3. إزالة أي ركاكة أو ترجمة حرفية مع المحافظة التامة على المعنى وسياق الشخصيات.
4. الحفاظ الصارم على أي وسوم أو علامات داخل النص مثل [حوار]، [تفكير]، [مؤثر]، <tags>، أو غيرها.
5. أرجع النتيجة حصراً كمصفوفة JSON صالحة بالشكل التالي دون أي نصوص إضافية:
[
  {
    "id": "bubble_id",
    "polishedText": "النص العربي المنقح فصيحاً وجذاباً",
    "notes": "ملاحظة سريعة للتعديل إن وجدت"
  }
]`;

  try {
    const cleanApiKey = apiKey.trim().replace(/^["']|["']$/g, "");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction}\n\nنصوص الفقاعات المطلوب تدقيقها وتحسينها:\n${JSON.stringify(promptInput, null, 2)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("No response from AI model");
    }

    const parsed: Array<{ id: string; polishedText: string; notes?: string }> = JSON.parse(rawText);

    const results: PolishedBubbleResult[] = validBubbles.map((orig) => {
      const match = parsed.find((p) => p.id === orig.id);
      return {
        id: orig.id,
        originalText: orig.originalText,
        oldText: orig.translatedText,
        polishedText: match?.polishedText || orig.translatedText,
        notes: match?.notes,
      };
    });

    return { results };
  } catch (err: any) {
    console.error("AI Proofread failed:", err);
    return { results: [], error: err.message || "Failed to proofread translations" };
  }
}
