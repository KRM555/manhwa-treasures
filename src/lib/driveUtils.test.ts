import { describe, it, expect } from "vitest";
import { parseDriveOrDirectLink } from "./driveUtils";

describe("driveUtils", () => {
  it("parses Google Drive file share links correctly", () => {
    const url = "https://drive.google.com/file/d/1XyZ987_abc-123/view?usp=sharing";
    const result = parseDriveOrDirectLink(url);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("drive_file");
    expect(result?.id).toBe("1XyZ987_abc-123");
    expect(result?.directDownloadUrl).toContain("1XyZ987_abc-123");
  });

  it("parses Google Drive open?id links correctly", () => {
    const url = "https://drive.google.com/open?id=12345ABCDEF";
    const result = parseDriveOrDirectLink(url);
    expect(result?.type).toBe("drive_file");
    expect(result?.id).toBe("12345ABCDEF");
  });

  it("parses Google Drive folder links correctly", () => {
    const url = "https://drive.google.com/drive/folders/1FolderId_999?usp=drive_link";
    const result = parseDriveOrDirectLink(url);
    expect(result?.type).toBe("drive_folder");
    expect(result?.id).toBe("1FolderId_999");
  });

  it("parses Google Drive folder with user index", () => {
    const url = "https://drive.google.com/drive/u/0/folders/folder_xyz_123";
    const result = parseDriveOrDirectLink(url);
    expect(result?.type).toBe("drive_folder");
    expect(result?.id).toBe("folder_xyz_123");
  });

  it("converts Dropbox links to direct download", () => {
    const url = "https://www.dropbox.com/s/example123/manga_raw.zip?dl=0";
    const result = parseDriveOrDirectLink(url);
    expect(result?.type).toBe("dropbox");
    expect(result?.directDownloadUrl).toContain("dl=1");
  });

  it("handles direct image or zip URLs", () => {
    const url = "https://example.com/chapter_12.zip";
    const result = parseDriveOrDirectLink(url);
    expect(result?.type).toBe("direct");
    expect(result?.directDownloadUrl).toBe("https://example.com/chapter_12.zip");
  });

  it("returns null for invalid or non-http URLs", () => {
    expect(parseDriveOrDirectLink("")).toBeNull();
    expect(parseDriveOrDirectLink("not-a-url")).toBeNull();
  });
});
