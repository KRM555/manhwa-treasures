import { SampleManga } from "@/types/manga";

export const SAMPLE_MANGA_PAGES: SampleManga[] = [
  {
    id: "action-shonen",
    title: "Battle Climax (Shonen)",
    genre: "Action / Supernatural",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80",
    fullImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
    sampleBubbles: [
      {
        id: "b1",
        originalText: "オレの本当の力を…見せてやる！",
        translatedText: ":: سأريك... قوتي الحقيقية الآن!",
        category: "scream"
      },
      {
        id: "b2",
        originalText: "ゴゴゴゴ… (ドドン)",
        translatedText: "SFX: [صوت دوي هائل - دمررر]",
        category: "sfx"
      },
      {
        id: "b3",
        originalText: "まさか…ここまで成長していたとは…！",
        translatedText: "() لا يعقل... هل تطور إلى هذا الحد بالفعل...؟! ()",
        category: "thought"
      }
    ]
  },
  {
    id: "manhwa-romance",
    title: "The Duke's Secret (Webtoon)",
    genre: "Romance / Drama",
    thumbnail: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80",
    fullImage: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80",
    sampleBubbles: [
      {
        id: "m1",
        originalText: "당신이 왜 여기에 있는 겁니까?",
        translatedText: "\"لماذا أنت متواجد هنا في هذا الوقت؟\"",
        category: "dialogue"
      },
      {
        id: "m2",
        originalText: "더 이상 도망칠 생각은 하지 마세요.",
        translatedText: "\"إياك والتفكير في الهروب مجدداً.\"",
        category: "dialogue"
      }
    ]
  }
];

export const TARGET_LANGUAGES = [
  { code: "ar", name: "Arabic (العربية)", flag: "🇸🇦", rtl: true },
  { code: "en", name: "English", flag: "🇺🇸", rtl: false },
  { code: "es", name: "Spanish (Español)", flag: "🇪🇸", rtl: false },
  { code: "fr", name: "French (Français)", flag: "🇫🇷", rtl: false },
  { code: "de", name: "German (Deutsch)", flag: "🇩🇪", rtl: false },
  { code: "pt", name: "Portuguese (Português)", flag: "🇧🇷", rtl: false },
  { code: "ja", name: "Japanese (日本語)", flag: "🇯🇵", rtl: false },
];