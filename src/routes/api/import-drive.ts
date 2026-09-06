import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { parseDriveOrDirectLink } from "@/lib/driveUtils";
import { filterZipEntries, sortImageNames } from "@/lib/zipUtils";

export const Route = createFileRoute("/api/import-drive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: string };
          const targetUrl = body?.url?.trim();

          if (!targetUrl) {
            return Response.json(
              {
                success: false,
                error: "يرجى تقديم رابط صالح / Please provide a valid link",
              },
              { status: 400 },
            );
          }

          const parsed = parseDriveOrDirectLink(targetUrl);
          if (!parsed) {
            return Response.json(
              {
                success: false,
                error:
                  "الرابط غير مدعوم؛ يرجى التأكد من أنه رابط Google Drive أو Dropbox أو رابط مباشر / Unsupported link format",
              },
              { status: 400 },
            );
          }

          const headers: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "*/*",
          };

          // 1. Handling Google Drive Folder
          if (parsed.type === "drive_folder" && parsed.id) {
            const folderUrl = `https://drive.google.com/embeddedfolderview?id=${parsed.id}#list`;
            const folderRes = await fetch(folderUrl, { headers });
            const html = await folderRes.text();

            // Extract file IDs from public embedded folder view
            const fileIdMatches = Array.from(
              html.matchAll(/(?:file\/d\/|id=)([a-zA-Z0-9_-]{25,})(?:[^"'>\s]*)(?:">|>)([^<]+)/g),
            );

            const discoveredFiles: { id: string; name: string }[] = [];
            const seenIds = new Set<string>();

            for (const match of fileIdMatches) {
              const fId = match[1];
              const fName = match[2]?.trim() || `page_${discoveredFiles.length + 1}.jpg`;
              if (fId && !seenIds.has(fId)) {
                seenIds.add(fId);
                discoveredFiles.push({ id: fId, name: fName });
              }
            }

            if (discoveredFiles.length > 0) {
              const maxImages = Math.min(discoveredFiles.length, 25);
              const extracted: { url: string; name: string }[] = [];

              for (let i = 0; i < maxImages; i++) {
                const item = discoveredFiles[i]!;
                const dlUrl = `https://drive.usercontent.google.com/download?id=${item.id}&export=download&confirm=t`;
                try {
                  const imgRes = await fetch(dlUrl, { headers, redirect: "follow" });
                  if (imgRes.ok) {
                    const arrayBuf = await imgRes.arrayBuffer();
                    const uint8 = new Uint8Array(arrayBuf);
                    const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4e;
                    const isWebp = uint8[8] === 0x57 && uint8[9] === 0x45 && uint8[10] === 0x42;
                    const mime = isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";
                    const b64 = Buffer.from(arrayBuf).toString("base64");
                    extracted.push({
                      name: item.name,
                      url: `data:${mime};base64,${b64}`,
                    });
                  }
                } catch {
                  // ignore individual image failure
                }
              }

              if (extracted.length > 0) {
                return Response.json({
                  success: true,
                  count: extracted.length,
                  images: extracted,
                });
              }
            }

            return Response.json(
              {
                success: false,
                error:
                  "تعذر قراءة محتويات المجلد مباشرة؛ يرجى التأكد من تفعيل خيار 'أي شخص لديه الرابط يمكنه العرض'، أو مشاركة المجلد كملف ZIP على Google Drive لسرعة أعلى.",
              },
              { status: 400 },
            );
          }

          // 2. Handling File / ZIP / Image
          const downloadUrl = parsed.directDownloadUrl;
          const fileRes = await fetch(downloadUrl, {
            headers,
            redirect: "follow",
          });

          if (!fileRes.ok) {
            return Response.json(
              {
                success: false,
                error: `فشل تنزيل الملف من الرابط (رمز الخطأ: ${fileRes.status}). تأكد من أن الرابط عام وليس خاصاً.`,
              },
              { status: 400 },
            );
          }

          const arrayBuffer = await fileRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Check if buffer is a ZIP archive (starts with PK\x03\x04 or PK\x05\x06)
          const isZip =
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            (buffer[2] === 0x03 || buffer[2] === 0x05);

          if (isZip) {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(arrayBuffer);
            const entries = filterZipEntries(Object.keys(zipContent.files));

            if (entries.length === 0) {
              return Response.json(
                {
                  success: false,
                  error: "الملف المضغوط لا يحتوي على أية صور مدعومة (JPG, PNG, WEBP).",
                },
                { status: 400 },
              );
            }

            const sortedEntries = sortImageNames(entries);
            const MAX_IMAGES = 25;
            const selected = sortedEntries.slice(0, MAX_IMAGES);

            const images: { url: string; name: string }[] = [];
            for (const entryName of selected) {
              const fileObj = zipContent.files[entryName];
              if (!fileObj) continue;
              const fileB64 = await fileObj.async("base64");
              const ext = entryName.split(".").pop()?.toLowerCase() || "jpeg";
              const mime =
                ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
              images.push({
                name: entryName.split("/").pop() || entryName,
                url: `data:${mime};base64,${fileB64}`,
              });
            }

            return Response.json({
              success: true,
              count: images.length,
              images,
            });
          }

          // Check if buffer is a single image
          const isJpeg =
            buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng =
            buffer.length >= 4 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47;
          const isWebp =
            buffer.length >= 12 &&
            buffer[0] === 0x52 &&
            buffer[1] === 0x49 &&
            buffer[2] === 0x46 &&
            buffer[3] === 0x46 &&
            buffer[8] === 0x57 &&
            buffer[9] === 0x45 &&
            buffer[10] === 0x42 &&
            buffer[11] === 0x50;

          if (isJpeg || isPng || isWebp) {
            const mime = isPng ? "image/png" : isWebp ? "image/webp" : "image/jpeg";
            const b64 = buffer.toString("base64");
            return Response.json({
              success: true,
              count: 1,
              images: [
                {
                  name: `drive_page_${Date.now()}.${isPng ? "png" : isWebp ? "webp" : "jpg"}`,
                  url: `data:${mime};base64,${b64}`,
                },
              ],
            });
          }

          // If content is HTML (often means access denied or Google login screen)
          const textPreview = buffer.slice(0, 500).toString("utf-8");
          if (textPreview.includes("<html") || textPreview.includes("<!DOCTYPE")) {
            return Response.json(
              {
                success: false,
                error:
                  "تعذر تنزيل الملف مباشرة؛ يبدو أن الرابط يتطلب تسجيل الدخول أو إذن وصول. تأكد من ضبط الرابط على 'Anyone with the link can view' (أي شخص لديه الرابط يمكنه العرض).",
              },
              { status: 400 },
            );
          }

          return Response.json(
            {
              success: false,
              error: "الملف الذي تم تنزيله ليس ملفاً مضغوطاً ZIP أو صورة مدعومة.",
            },
            { status: 400 },
          );
        } catch (err: any) {
          console.error("Error in /api/import-drive:", err);
          return Response.json(
            {
              success: false,
              error: err?.message || "حدث خطأ غير متوقع أثناء استيراد الرابط",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
