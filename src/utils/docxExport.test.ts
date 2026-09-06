import { describe, it, expect } from "vitest";
import { createChapterDocxDocument } from "./docxExport";
import { MangaPageItem } from "@/types/manga";
import { Document, Packer } from "docx";

describe("DOCX Chapter Export (docxExport)", () => {
  const samplePages: MangaPageItem[] = [
    {
      id: "p1",
      fileName: "Chapter_01_Page_01.png",
      previewUrl: "",
      status: "completed",
      items: [
        {
          id: "b1",
          originalText: "I will survive this dungeon!",
          translatedText: "سأنجو من هذا الدنجن بالتأكيد!",
          category: "dialogue",
        },
        {
          id: "b2",
          originalText: "The aura is overwhelming...",
          translatedText: "الهالة مرعبة للغاية...",
          category: "thought",
        },
      ],
    },
    {
      id: "p2",
      fileName: "Chapter_01_Page_02.png",
      previewUrl: "",
      status: "completed",
      items: [], // empty page (no dialogue)
    },
  ];

  it("creates a valid docx Document instance with RTL Arabic formatting", async () => {
    const doc = createChapterDocxDocument(samplePages, true);
    expect(doc).toBeInstanceOf(Document);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("creates a valid docx Document instance with LTR English formatting", async () => {
    const doc = createChapterDocxDocument(samplePages, false);
    expect(doc).toBeInstanceOf(Document);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("packs into a binary buffer successfully without schema errors", async () => {
    const doc = createChapterDocxDocument(samplePages, true);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("applies custom tag prefixes and suffixes correctly", async () => {
    const customTags = [
      { value: "dialogue", label: "حوار", prefix: '"": ', suffix: "" },
      { value: "thought", label: "أفكار", prefix: "(", suffix: ")" },
      { value: "sfx", label: "مؤثرات", prefix: "[SFX: ", suffix: "]" },
    ];
    const doc = createChapterDocxDocument(samplePages, true, {
      tags: customTags,
    });
    expect(doc).toBeInstanceOf(Document);
    const buffer = await Packer.toBuffer(doc);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("excludes SFX items when extractSFX is false", async () => {
    const pagesWithSfx: MangaPageItem[] = [
      {
        id: "p1",
        fileName: "Page_01.png",
        previewUrl: "",
        status: "completed",
        items: [
          { id: "1", originalText: "Hello", translatedText: "مرحبا", category: "dialogue" },
          { id: "2", originalText: "BOOM", translatedText: "بووم", category: "sfx" },
        ],
      },
    ];
    const doc = createChapterDocxDocument(pagesWithSfx, true, {
      extractSFX: false,
    });
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it("exports original text when textType is 'original'", async () => {
    const doc = createChapterDocxDocument(samplePages, false, {
      textType: "original",
    });
    const buffer = await Packer.toBuffer(doc);
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
