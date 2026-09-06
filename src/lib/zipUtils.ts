/**
 * Utility functions for handling comic/manga page filenames,
 * natural sorting, and ZIP entry filtering.
 */

const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|webp)$/i;

/**
 * Filter out non-image files, system files, and Mac OS metadata archives.
 */
export function filterZipEntries(filenames: string[]): string[] {
  return filenames.filter((filename) => {
    // Ignore macOS system and metadata entries
    if (filename.includes("__MACOSX/") || filename.startsWith("__MACOSX")) {
      return false;
    }
    const basename = filename.split("/").pop() || "";
    if (basename.startsWith("._") || basename.startsWith(".DS_Store")) {
      return false;
    }
    // Must end with a supported image extension
    return IMAGE_EXTENSION_REGEX.test(basename);
  });
}

/**
 * Natural sort for manga and chapter page filenames.
 * Ensures:
 * - page_1.png, page_2.png, page_10.png (instead of page_1, page_10, page_2)
 * - ch01_01.jpg, ch01_02.jpg, ch01_10.jpg
 */
export function sortImageNames(names: string[]): string[] {
  return [...names].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}

/**
 * Checks if a filename has a clear page or chapter number indicator.
 */
export function hasPageNumber(name: string): boolean {
  return /(?:^|[^0-9])(?:page|pg|p|chapter|ch)?[_ -]?[0-9]+(?:[^0-9]|$)/i.test(name);
}

/**
 * Extracts the likely integer page number from a filename if present.
 */
export function extractPageNumber(name: string): number | null {
  const clean = name.replace(/\.[a-zA-Z0-9]+$/, ""); // remove extension
  const matches = clean.match(/(\d+)/g);
  if (!matches || matches.length === 0) return null;
  // Usually the last sequence of numbers in the filename represents the page number
  const lastNum = matches[matches.length - 1];
  const num = parseInt(lastNum!, 10);
  return isNaN(num) ? null : num;
}
