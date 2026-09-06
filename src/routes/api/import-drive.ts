import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import { parseDriveOrDirectLink } from "@/lib/driveUtils";
import { filterZipEntries, sortImageNames } from "@/lib/zipUtils";

/**
 * Downloads a file from Google Drive handling redirects, cookies,
 * large-file virus confirmation forms, and thumbnail/lh3 fallbacks.
 */
async function fetchGoogleDriveBuffer(
  fileId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const cookieJar = new Map<string, string>();

  function getCookieHeader(): string {
    return Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  function storeCookies(res: Response) {
    const rawCookies = (res.headers as any).getSetCookie?.() || [];
    const singleCookie = res.headers.get("set-cookie");
    const all = [...rawCookies, ...(singleCookie ? [singleCookie] : [])];
    for (const c of all) {
      const match = c.match(/^([^=;]+)=([^;]*)/);
      if (match) {
        cookieJar.set(match[1].trim(), match[2].trim());
      }
    }
  }

  const baseHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  };

  let currentUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  let attempts = 0;
  const maxAttempts = 6;

  while (attempts < maxAttempts) {
    attempts++;
    const headers = { ...baseHeaders };
    const cookieStr = getCookieHeader();
    if (cookieStr) headers["Cookie"] = cookieStr;

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        headers,
        redirect: "manual",
      });
    } catch {
      break;
    }

    storeCookies(res);

    // If redirected (301, 302, 303, 307, 308)
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).href;
      continue;
    }

    if (!res.ok) {
      break;
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const contentType = res.headers.get("content-type") || "";

    // Check if buffer is a ZIP archive or Image
    const isZip =
      buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05);
    const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50;

    if (isZip || isJpeg || isPng || isWebp) {
      return { buffer: buf, contentType };
    }

    // If it's HTML, check if Google presented a confirmation page (large file virus scan)
    const text = buf.toString("utf-8");
    if (text.includes("<html") || text.includes("<!DOCTYPE")) {
      // 1. Check for form action and inputs
      const formMatch =
        text.match(
          /<form[^>]+id=["'](?:downloadForm|download-form)["'][^>]*action=["']([^"']+)["']/i,
        ) ||
        text.match(
          /<form[^>]*action=["']([^"']+)["'][^>]*id=["'](?:downloadForm|download-form)["']/i,
        ) ||
        text.match(/<form[^>]+action=["']([^"']+)["']/i);

      if (formMatch) {
        let action = formMatch[1].replace(/&amp;/g, "&");
        if (!action.startsWith("http")) {
          action = new URL(action, currentUrl).href;
        }

        const inputRegex = /<input[^>]+name=["']([^"']+)["'][^>]*value=["']([^"']*)["']/gi;
        const inputRegexAlt = /<input[^>]+value=["']([^"']*)["'][^>]*name=["']([^"']+)["']/gi;

        const params = new URLSearchParams();
        let m: RegExpExecArray | null;
        while ((m = inputRegex.exec(text)) !== null) {
          params.set(m[1], m[2]);
        }
        while ((m = inputRegexAlt.exec(text)) !== null) {
          params.set(m[2], m[1]);
        }

        const paramString = params.toString();
        if (paramString) {
          currentUrl = action.includes("?")
            ? `${action}&${paramString}`
            : `${action}?${paramString}`;
          continue;
        }
      }

      // 2. Check for href="/uc?export=download...
      const linkMatch =
        text.match(/id=["']uc-download-link["'][^>]*href=["']([^"']+)["']/i) ||
        text.match(/href=["'](\/uc\?export=download[^"']+)["']/i) ||
        text.match(/href=["'](https:\/\/drive\.google\.com\/uc\?export=download[^"']+)["']/i);

      if (linkMatch) {
        const confirmHref = linkMatch[1].replace(/&amp;/g, "&");
        currentUrl = confirmHref.startsWith("http")
          ? confirmHref
          : new URL(confirmHref, currentUrl).href;
        continue;
      }

      // 3. Check for "downloadUrl":"..."
      const dlUrlMatch = text.match(/"downloadUrl":\s*"([^"]+)"/);
      if (dlUrlMatch) {
        currentUrl = dlUrlMatch[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
        continue;
      }
    }

    break;
  }

  // Fallback: If it might be an image, try lh3 and thumbnail endpoints directly
  const imageFallbacks = [
    `https://lh3.googleusercontent.com/d/${fileId}=s0`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w3000`,
  ];

  for (const fallbackUrl of imageFallbacks) {
    try {
      const fbRes = await fetch(fallbackUrl, {
        headers: baseHeaders,
        redirect: "follow",
      });
      if (fbRes.ok) {
        const fbBuf = Buffer.from(await fbRes.arrayBuffer());
        const isJpeg = fbBuf.length >= 3 && fbBuf[0] === 0xff && fbBuf[1] === 0xd8;
        const isPng =
          fbBuf.length >= 4 && fbBuf[0] === 0x89 && fbBuf[1] === 0x50 && fbBuf[2] === 0x4e;
        const isWebp =
          fbBuf.length >= 12 && fbBuf[8] === 0x57 && fbBuf[9] === 0x45 && fbBuf[10] === 0x42;
        if (isJpeg || isPng || isWebp) {
          return { buffer: fbBuf, contentType: fbRes.headers.get("content-type") || "image/jpeg" };
        }
      }
    } catch {
      // continue
    }
  }

  return null;
}

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

          // 1. Handling Google Drive Folder
          // Google Drive completely restricts third-party web scrapers from recursively reading folders
          // without user OAuth tokens. We return an empathetic, clear actionable guidance message.
          if (parsed.type === "drive_folder") {
            return Response.json(
              {
                success: false,
                isFolder: true,
                error:
                  "عفواً، تمنع سياسة أمان Google Drive المواقع الخارجية من تصفح المجلدات (Folders) مباشرة.\n\n💡 الحل السهل جداً:\n1. افتح مجلد الصور في Google Drive.\n2. اضغط كليك يمين على المجلد واختر «تنزيل» (Download) ليتم حفظه كملف مضغوط ZIP.\n3. يمكنك سحب وإفلات ملف الـ ZIP مباشرة في نافذة الاستيراد هنا وسيتم فك ضغطه فوراً، أو رفع ملف الـ ZIP إلى Google Drive ومشاركة رابطه!",
              },
              { status: 400 },
            );
          }

          const defaultHeaders: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "*/*",
          };

          let buffer: Buffer | null = null;

          // 2. Handling Google Drive File (ZIP or Image)
          if (parsed.type === "drive_file" && parsed.id) {
            const driveResult = await fetchGoogleDriveBuffer(parsed.id);
            if (driveResult) {
              buffer = driveResult.buffer;
            } else {
              return Response.json(
                {
                  success: false,
                  error:
                    "تعذر تنزيل الملف من Google Drive. يرجى التأكد من:\n1. ضبط مشاركة الملف على «أي شخص لديه الرابط يمكنه العرض» (Anyone with the link).\n2. إذا كان الملف مجلداً وليس ملفاً مضغوطاً ZIP، يرجى تنزيله كـ ZIP ورفعه هنا مباشرة.",
                },
                { status: 400 },
              );
            }
          } else {
            // 3. Handling Dropbox or Direct File / ZIP link
            const downloadUrl = parsed.directDownloadUrl;
            const fileRes = await fetch(downloadUrl, {
              headers: defaultHeaders,
              redirect: "follow",
            });

            if (!fileRes.ok) {
              return Response.json(
                {
                  success: false,
                  error: `فشل تنزيل الملف من الرابط (رمز الخطأ: ${fileRes.status}). تأكد من أن الرابط عام ومتاح للجميع.`,
                },
                { status: 400 },
              );
            }

            const arrayBuffer = await fileRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          }

          if (!buffer || buffer.length === 0) {
            return Response.json(
              {
                success: false,
                error: "الملف الذي تم تنزيله فارغ أو غير صالح.",
              },
              { status: 400 },
            );
          }

          // Check if buffer is a ZIP archive (starts with PK\x03\x04 or PK\x05\x06)
          const isZip =
            buffer.length >= 4 &&
            buffer[0] === 0x50 &&
            buffer[1] === 0x4b &&
            (buffer[2] === 0x03 || buffer[2] === 0x05);

          if (isZip) {
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(buffer);
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

          // If content is HTML
          const textPreview = buffer.slice(0, 500).toString("utf-8");
          if (textPreview.includes("<html") || textPreview.includes("<!DOCTYPE")) {
            return Response.json(
              {
                success: false,
                error:
                  "تعذر تنزيل الملف مباشرة؛ يبدو أن الرابط يتطلب تسجيل الدخول أو إذن وصول، أو أنه مجلد لم يتم حفظه كـ ZIP. يرجى التأكد من ضبط الرابط على «أي شخص لديه الرابط يمكنه العرض» أو تنزيل المجلد كملف ZIP ورفعه هنا.",
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
