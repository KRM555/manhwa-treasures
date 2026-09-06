import { describe, it, expect } from "vitest";
import { sortImageNames, filterZipEntries, hasPageNumber, extractPageNumber } from "./zipUtils";

describe("ZIP Extraction & Page Sorting (zipUtils)", () => {
  describe("sortImageNames (Natural alphanumeric sorting)", () => {
    it("sorts single-digit and multi-digit page numbers chronologically", () => {
      const input = ["page_10.png", "page_1.png", "page_20.png", "page_2.png", "page_3.png"];
      const sorted = sortImageNames(input);
      expect(sorted).toEqual([
        "page_1.png",
        "page_2.png",
        "page_3.png",
        "page_10.png",
        "page_20.png",
      ]);
    });

    it("sorts complex chapter and episode page naming schemes accurately", () => {
      const input = ["Ch01_p12.jpg", "Ch01_p02.jpg", "Ch01_p01.jpg", "Ch01_p10.jpg"];
      const sorted = sortImageNames(input);
      expect(sorted).toEqual(["Ch01_p01.jpg", "Ch01_p02.jpg", "Ch01_p10.jpg", "Ch01_p12.jpg"]);
    });

    it("handles plain numeric filenames", () => {
      const input = ["10.jpg", "1.jpg", "2.jpg", "11.jpg", "21.jpg"];
      const sorted = sortImageNames(input);
      expect(sorted).toEqual(["1.jpg", "2.jpg", "10.jpg", "11.jpg", "21.jpg"]);
    });
  });

  describe("filterZipEntries", () => {
    it("filters out macOS metadata files (__MACOSX, .DS_Store, ._ files)", () => {
      const zipFiles = [
        "__MACOSX/._page_1.png",
        "__MACOSX/page_1.png",
        "Chapter_1/.DS_Store",
        "Chapter_1/._p1.jpg",
        "Chapter_1/p1.jpg",
        "Chapter_1/p2.png",
        "Chapter_1/p3.webp",
        "readme.txt",
        "thumbs.db",
      ];

      const filtered = filterZipEntries(zipFiles);
      expect(filtered).toEqual(["Chapter_1/p1.jpg", "Chapter_1/p2.png", "Chapter_1/p3.webp"]);
    });

    it("accepts only valid image extensions (case insensitive)", () => {
      const zipFiles = [
        "image1.JPG",
        "image2.PNG",
        "image3.jpeg",
        "image4.WEBP",
        "document.pdf",
        "script.docx",
      ];

      const filtered = filterZipEntries(zipFiles);
      expect(filtered).toEqual(["image1.JPG", "image2.PNG", "image3.jpeg", "image4.WEBP"]);
    });
  });

  describe("hasPageNumber & extractPageNumber", () => {
    it("detects whether a filename contains a page number", () => {
      expect(hasPageNumber("page_01.png")).toBe(true);
      expect(hasPageNumber("ch2_p15.jpg")).toBe(true);
      expect(hasPageNumber("05.webp")).toBe(true);
      expect(hasPageNumber("cover_art.png")).toBe(false);
      expect(hasPageNumber("credits.jpg")).toBe(false);
    });

    it("extracts numeric page value from filename", () => {
      expect(extractPageNumber("p_14.png")).toBe(14);
      expect(extractPageNumber("chapter01_07.jpg")).toBe(7);
      expect(extractPageNumber("no_number.png")).toBeNull();
    });
  });
});
