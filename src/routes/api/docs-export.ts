import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

const EXPORT_DIR = path.join(process.cwd(), "data", "exported_docs");

function ensureDirectoryExists() {
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export const Route = createFileRoute("/api/docs-export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const rawId = url.searchParams.get("id");
          const format = url.searchParams.get("format") || "docx";

          if (!rawId) {
            return new Response(JSON.stringify({ error: "Missing document ID" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const docId = sanitizeId(rawId);
          const jsonPath = path.join(EXPORT_DIR, `${docId}.json`);
          const docxPath = path.join(EXPORT_DIR, `${docId}.docx`);

          if (!fs.existsSync(jsonPath) && !fs.existsSync(docxPath)) {
            return new Response(
              `<!DOCTYPE html><html dir="rtl"><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>المستند غير موجود أو انتهت صلاحيته</h2></body></html>`,
              {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              },
            );
          }

          // If docx is requested (default for Google Docs Viewer)
          if (format === "docx" && fs.existsSync(docxPath)) {
            const docxBuffer = fs.readFileSync(docxPath);
            return new Response(docxBuffer, {
              status: 200,
              headers: {
                "Content-Type":
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `inline; filename="manga_translation_${docId}.docx"`,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=86400",
              },
            });
          }

          // Return HTML version
          let docData: any = {};
          if (fs.existsSync(jsonPath)) {
            docData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          }

          if (url.searchParams.get("json") === "1") {
            return new Response(JSON.stringify(docData), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const htmlContent =
            docData.html ||
            `<div style="font-family:sans-serif;padding:20px;">${docData.text || "لا توجد ترجمة"}</div>`;

          const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docData.title || "مستند ترجمة المانهوا"} - Google Docs Export</title>
  <style>
    body {
      background: #f8fafc;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .doc-page {
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 40px;
      margin-bottom: 24px;
      box-sizing: border-box;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .doc-page { box-shadow: none; border-radius: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width:820px;width:100%;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-weight:bold;font-size:14px;color:#475569;">📄 ${docData.title || "ترجمة المانهوا"} (${docData.author || "مترجم"})</div>
    <button onclick="window.print()" style="padding:6px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;">طباعة / حفظ PDF</button>
  </div>
  <div class="doc-page">
    ${htmlContent}
  </div>
</body>
</html>`;

          return new Response(fullHtml, {
            status: 200,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err: any) {
          console.error("Error serving exported doc:", err);
          return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      POST: async ({ request }) => {
        try {
          ensureDirectoryExists();
          const body = (await request.json()) as {
            docId?: string;
            title?: string;
            author?: string;
            text?: string;
            html?: string;
            docxBase64?: string;
          };

          const docId = sanitizeId(
            body.docId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          );

          // Save JSON metadata and HTML
          const jsonPath = path.join(EXPORT_DIR, `${docId}.json`);
          fs.writeFileSync(
            jsonPath,
            JSON.stringify(
              {
                id: docId,
                title: body.title || "مستند ترجمة المانهوا",
                author: body.author || "مترجم المانهوا",
                createdAt: new Date().toISOString(),
                text: body.text || "",
                html: body.html || "",
              },
              null,
              2,
            ),
            "utf-8",
          );

          // Save DOCX if provided
          if (body.docxBase64) {
            const docxBuffer = Buffer.from(body.docxBase64, "base64");
            const docxPath = path.join(EXPORT_DIR, `${docId}.docx`);
            fs.writeFileSync(docxPath, docxBuffer);
          }

          // Build public URL and Google Docs Viewer URL
          const reqUrl = new URL(request.url);
          const host =
            request.headers.get("x-forwarded-host") || request.headers.get("host") || reqUrl.host;
          const proto =
            request.headers.get("x-forwarded-proto") || reqUrl.protocol.replace(":", "") || "https";
          const origin = `${proto}://${host}`;

          const fileUrl = `${origin}/api/docs-export?id=${docId}&format=docx`;
          const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=false`;
          const htmlViewerUrl = `${origin}/api/docs-export?id=${docId}&format=html`;

          return new Response(
            JSON.stringify({
              success: true,
              docId,
              fileUrl,
              googleDocsUrl,
              htmlViewerUrl,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err: any) {
          console.error("Error creating exported doc:", err);
          return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
