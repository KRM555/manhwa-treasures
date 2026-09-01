import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import IndexPage from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manhwa Studio — Webtoon OCR & Translation Tool" },
      {
        name: "description",
        content:
          "Extract, translate, and format webtoon and manga scripts with Gemini-powered OCR, tag formatting, glossaries, and DOCX export.",
      },
      { property: "og:title", content: "Manhwa Studio — Webtoon OCR & Translation Tool" },
      {
        property: "og:description",
        content:
          "Extract, translate, and format webtoon and manga scripts with Gemini-powered OCR, tag formatting, glossaries, and DOCX export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading Manhwa Studio…
        </div>
      }
    >
      <IndexPage />
    </ClientOnly>
  );
}
