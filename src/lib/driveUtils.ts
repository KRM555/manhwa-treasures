/**
 * Utilities to parse and extract metadata from Google Drive, Dropbox, and direct download links.
 */

export interface ParsedLinkInfo {
  type: "drive_file" | "drive_folder" | "dropbox" | "direct";
  id?: string;
  directDownloadUrl: string;
  originalUrl: string;
}

export function parseDriveOrDirectLink(url: string): ParsedLinkInfo | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;

  // 1. Google Drive Folder
  // e.g. https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ?usp=sharing
  // e.g. https://drive.google.com/drive/u/0/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
  const driveFolderMatch = trimmed.match(
    /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/)([a-zA-Z0-9_-]+)/i,
  );
  if (driveFolderMatch && driveFolderMatch[1]) {
    const folderId = driveFolderMatch[1];
    return {
      type: "drive_folder",
      id: folderId,
      directDownloadUrl: `https://drive.google.com/embeddedfolderview?id=${folderId}#list`,
      originalUrl: trimmed,
    };
  }

  // 2. Google Drive File
  // e.g. https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view?usp=sharing
  // e.g. https://drive.google.com/open?id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
  // e.g. https://drive.google.com/uc?id=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
  const driveFileMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:[a-zA-Z0-9_=&-]*&)?id=([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);

  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return {
      type: "drive_file",
      id: fileId,
      directDownloadUrl: `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      originalUrl: trimmed,
    };
  }

  // 3. Dropbox Link (auto-convert dl=0 to dl=1 for raw binary file)
  if (trimmed.includes("dropbox.com/")) {
    let dlUrl = trimmed;
    if (dlUrl.includes("dl=0")) {
      dlUrl = dlUrl.replace("dl=0", "dl=1");
    } else if (!dlUrl.includes("dl=1")) {
      dlUrl = dlUrl.includes("?") ? `${dlUrl}&dl=1` : `${dlUrl}?dl=1`;
    }
    return {
      type: "dropbox",
      directDownloadUrl: dlUrl,
      originalUrl: trimmed,
    };
  }

  // 4. Any other direct HTTP/HTTPS URL
  return {
    type: "direct",
    directDownloadUrl: trimmed,
    originalUrl: trimmed,
  };
}
