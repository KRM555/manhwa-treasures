import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Copy,
  ExternalLink,
  Crown,
  Check,
  Share2,
  Mail,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { BubbleData, ImageData, TagRule } from "@/types";
import { useI18n } from "@/lib/language";
import { toast } from "sonner";
import { createChapterDocxDocument } from "@/utils/docxExport";
import { Packer } from "docx";

interface GoogleDocsExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVip: boolean;
  currentUserEmail: string | null;
  images: ImageData[];
  resultsMap: Record<string, BubbleData[]>;
  tags: TagRule[];
  tagsEnabled: boolean;
  startPageNumber: number;
  useFilenamePageNumber: boolean;
}

export const GoogleDocsExportModal: React.FC<GoogleDocsExportModalProps> = ({
  open,
  onOpenChange,
  isVip,
  currentUserEmail,
  images,
  resultsMap,
  tags,
  tagsEnabled,
  startPageNumber,
  useFilenamePageNumber,
}) => {
  const { lang } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDocxLink, setCopiedDocxLink] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [googleDocsUrl, setGoogleDocsUrl] = useState<string | null>(null);
  const [fileDownloadUrl, setFileDownloadUrl] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  const authorEmail = currentUserEmail || "مترجم المانهوا";

  // Build formatted text & HTML representation
  const buildDocumentHtml = (): { text: string; html: string } => {
    let plain = `📄 مسودة ترجمة المانهوا - Google Docs Export\n`;
    plain += `المترجم: ${authorEmail}\n`;
    plain += `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")} | ${new Date().toLocaleTimeString("ar-EG")}\n`;
    plain += `عدد الصفحات: ${images.length}\n`;
    plain += `=========================================\n\n`;

    let html = `
      <div dir="rtl" style="font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px;">
          <h1 style="color: #1d4ed8; font-size: 24px; margin: 0 0 8px 0;">📄 مسودة ترجمة المانهوا المعتمدة</h1>
          <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>المترجم (البريد):</strong> ${authorEmail}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>تاريخ التصدير:</strong> ${new Date().toLocaleDateString("ar-EG")} - ${new Date().toLocaleTimeString("ar-EG")}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #64748b;"><strong>إجمالي الصفحات:</strong> ${images.length} صفحة</p>
        </div>
    `;

    images.forEach((img, idx) => {
      const pageNum = idx + startPageNumber;
      const bubbles = resultsMap[img.id] || [];

      plain += `\n--- الصفحة #${pageNum} (${img.name}) ---\n`;
      html += `
        <div style="margin-top: 24px; margin-bottom: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
          <h2 style="color: #0f172a; font-size: 16px; margin: 0 0 10px 0; border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px;">
            📑 صفحة #${pageNum} &mdash; <span style="font-weight: normal; color: #64748b; font-size: 13px;">${img.name}</span>
          </h2>
          <div style="margin-top: 8px;">
      `;

      if (bubbles.length === 0) {
        plain += `(لا توجد نصوص مستخرجة)\n`;
        html += `<p style="color: #94a3b8; font-style: italic; font-size: 13px;">لا توجد نصوص في هذه الصفحة</p>`;
      } else {
        bubbles.forEach((b, bIdx) => {
          let tagPrefix = "";
          let tagSuffix = "";
          if (tagsEnabled && tags.length > 0) {
            const rule = tags.find((t) => t.value === b.category);
            if (rule) {
              tagPrefix = rule.prefix;
              tagSuffix = rule.suffix;
            }
          }

          const rawText = b.translatedText || "(نص فارغ)";
          const formatted = `${tagPrefix}${rawText}${tagSuffix}`;
          plain += `${formatted}\n`;

          const tagBadge =
            tagPrefix || tagSuffix
              ? `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; margin-left: 6px;">${tagPrefix}${tagSuffix}</span>`
              : "";

          html += `
            <div style="margin-bottom: 8px; padding: 6px 10px; background-color: #ffffff; border-radius: 6px; border: 1px solid #f1f5f9;">
              <span style="color: #94a3b8; font-size: 11px; margin-left: 8px;">#${bIdx + 1}</span>
              ${tagBadge}
              <span style="font-size: 14px; font-weight: 500;">${rawText}</span>
            </div>
          `;
        });
      }

      html += `</div></div>`;
    });

    html += `</div>`;
    return { text: plain, html };
  };

  const handleGenerateGoogleDocsLink = async () => {
    if (images.length === 0) {
      toast.error(lang === "ar" ? "لا توجد صور لتصديرها" : "No images to export");
      return;
    }

    setIsGenerating(true);
    try {
      const { text, html } = buildDocumentHtml();

      // Create DOCX binary for Google Docs Viewer
      const docPages = images.map((img) => ({
        fileName: img.name,
        bubbles: resultsMap[img.id] || [],
      }));

      const doc = createChapterDocxDocument(docPages, true, {
        startPageNumber,
        useFilenamePageNumber,
        tags,
        tagsEnabled,
        textType: "translated",
      });

      const docxBlob = await Packer.toBlob(doc);
      const arrayBuffer = await docxBlob.arrayBuffer();
      const docxBase64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );

      const generatedId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Post to backend API
      const res = await fetch("/api/docs-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: generatedId,
          title: `ترجمة فصول المانهوا - ${images.length} صفحة`,
          author: authorEmail,
          text,
          html,
          docxBase64,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create document on server");
      }

      const data = await res.json();
      setDocId(data.docId);
      setGoogleDocsUrl(data.googleDocsUrl);
      setFileDownloadUrl(data.fileUrl);

      toast.success(
        lang === "ar"
          ? "تم تجهيز رابط Google Docs بنجاح! جاهز للفتح والمشاركة 🚀"
          : "Google Docs link generated successfully!",
      );
    } catch (err: any) {
      console.error("Error creating Google Docs link:", err);
      toast.error(
        lang === "ar"
          ? "تعذر توليد رابط Google Docs، يرجى المحاولة مرة أخرى"
          : "Failed to generate Google Docs link",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate link when modal opens if not already created
  useEffect(() => {
    if (open && isVip && !googleDocsUrl && !isGenerating && images.length > 0) {
      handleGenerateGoogleDocsLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isVip]);

  const handleOpenGoogleDocsDirectly = () => {
    if (googleDocsUrl) {
      window.open(googleDocsUrl, "_blank");
      toast.info(
        lang === "ar"
          ? "جاري فتح المستند داخل Google Docs! يمكنك النقر على «فتح باستخدام مستندات Google» بالأعلى لتعديله في Drive 📄"
          : "Opening document directly in Google Docs!",
        { duration: 6000 },
      );
    } else {
      handleGenerateGoogleDocsLink();
    }
  };

  const handleCopyGoogleDocsLink = async () => {
    if (!googleDocsUrl) return;
    try {
      await navigator.clipboard.writeText(googleDocsUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
      toast.success(
        lang === "ar"
          ? "تم نسخ رابط Google Docs! يمكن لأي شخص فتحه لرؤية الترجمة كاملة 📋"
          : "Google Docs link copied to clipboard!",
      );
    } catch {
      toast.error("فشل النسخ إلى الحافظة");
    }
  };

  const handleCopyToClipboardFormatted = async () => {
    try {
      const { text, html } = buildDocumentHtml();
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([text], { type: "text/plain" });
        const htmlBlob = new Blob([html], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 3000);
      toast.success(
        lang === "ar"
          ? "تم نسخ محتوى الترجمة بتنسيق منسق للحافظة (Ctrl+V)!"
          : "Copied formatted translation to clipboard!",
      );
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const handleOpenDocsNew = async () => {
    await handleCopyToClipboardFormatted();
    window.open("https://docs.new", "_blank");
    toast.info(
      lang === "ar"
        ? "تم فتح Google Docs! اضغط (Ctrl+V) داخل المستند للصق الترجمة المنسقة فوراً 📄"
        : "Opening docs.new. Press Ctrl+V inside the document.",
      { duration: 5000 },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 rounded-2xl overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>
                    {lang === "ar" ? "تصدير إلى مستندات Google Docs" : "Google Docs Export"}
                  </span>
                  <span className="text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3 fill-current" /> VIP
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "توليد رابط مباشر يفتح المستند مباشرة على Google Docs مع كامل الترجمة"
                    : "Generate a direct link that opens translation in Google Docs"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          {!isVip ? (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-3 text-center">
              <Crown className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">
                {lang === "ar" ? "ميزة حصرية لأعضاء VIP 👑" : "Exclusive VIP Perk 👑"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                {lang === "ar"
                  ? "تصدير ترجمة الفصول المنسقة برابط مباشر إلى Google Docs ميزة حصرية لأعضاء VIP."
                  : "Direct Google Docs export is an exclusive VIP feature."}
              </p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  window.dispatchEvent(new CustomEvent("open_auth_modal"));
                }}
                className="text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              >
                {lang === "ar" ? "تسجيل الدخول / استعراض VIP" : "Sign In / View VIP"}
              </Button>
            </div>
          ) : (
            <>
              {/* Account info banner */}
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className="text-muted-foreground">
                    {lang === "ar" ? "المترجم المعتمد:" : "Translator:"}
                  </span>
                  <span className="font-bold text-foreground">{authorEmail}</span>
                </div>
                <Badge
                  variant="outline"
                  className="border-blue-500/40 text-blue-600 dark:text-blue-400 font-bold"
                >
                  {images.length} {lang === "ar" ? "صفحة" : "pages"}
                </Badge>
              </div>

              {/* PRIMARY: Direct Google Docs Link Card */}
              <div className="p-4 bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-2xl border-2 border-blue-500/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span className="text-sm font-extrabold text-foreground">
                      {lang === "ar"
                        ? "رابط Google Docs المباشر (docs.google.com)"
                        : "Direct Google Docs Link"}
                    </span>
                  </div>
                  {isGenerating && (
                    <span className="flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {lang === "ar" ? "جاري التجهيز..." : "Generating..."}
                    </span>
                  )}
                </div>

                {/* The Direct Google Docs Link Field */}
                {googleDocsUrl ? (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-background border border-blue-500/40 rounded-xl flex items-center justify-between gap-2 shadow-inner">
                      <span className="text-xs font-mono text-blue-700 dark:text-blue-300 truncate select-all">
                        {googleDocsUrl}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleCopyGoogleDocsLink}
                        className="h-7 text-xs font-bold gap-1 shrink-0 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 text-blue-700 dark:text-blue-300"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{lang === "ar" ? "تم النسخ!" : "Copied!"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{lang === "ar" ? "نسخ الرابط" : "Copy Link"}</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* HERO BUTTON: Open Directly in Google Docs */}
                    <Button
                      onClick={handleOpenGoogleDocsDirectly}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>
                        {lang === "ar"
                          ? "الانتقال إلى مستند Google Docs مباشرة 🚀"
                          : "Open Directly in Google Docs 🚀"}
                      </span>
                    </Button>

                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                      💡{" "}
                      <strong>
                        {lang === "ar" ? "كيف يعمل الرابط؟" : "How does this link work?"}
                      </strong>{" "}
                      {lang === "ar"
                        ? "عند فتح هذا الرابط، سينقلك مباشرة إلى docs.google.com والترجمة معروضة أمامك بالكامل. ولتعديلها أو حفظها في Google Drive الخاص بك، اضغط على زر «فتح باستخدام مستندات Google» في أعلى شاشة Google Docs."
                        : "Opening this link takes you directly to docs.google.com with the translated chapter loaded. Click 'Open with Google Docs' at the top to edit."}
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center">
                    <Button
                      onClick={handleGenerateGoogleDocsLink}
                      disabled={isGenerating}
                      className="rounded-xl bg-blue-600 text-white font-bold text-xs gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{lang === "ar" ? "جاري بناء المستند..." : "Generating..."}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {lang === "ar"
                              ? "توليد رابط Google Docs الآن"
                              : "Generate Google Docs Link"}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Secondary Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. Open blank docs.new with copy */}
                <Button
                  variant="outline"
                  onClick={handleOpenDocsNew}
                  className="h-12 flex items-center justify-center gap-2 rounded-xl border-border hover:bg-muted text-xs font-semibold"
                >
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                  <span>
                    {lang === "ar" ? "فتح مستند فارغ جديد (docs.new)" : "New Blank Document"}
                  </span>
                </Button>

                {/* 2. Copy Rich Text */}
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboardFormatted}
                  className="h-12 flex items-center justify-center gap-2 rounded-xl border-border hover:bg-muted text-xs font-semibold"
                >
                  {copiedContent ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-indigo-500" />
                  )}
                  <span>
                    {copiedContent
                      ? lang === "ar"
                        ? "تم نسخ المحتوى!"
                        : "Copied!"
                      : lang === "ar"
                        ? "نسخ النص المنسق للحافظة"
                        : "Copy Formatted Text"}
                  </span>
                </Button>
              </div>

              {/* Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-foreground">
                  {lang === "ar" ? "معاينة نصوص الترجمة:" : "Translation Preview:"}
                </span>
                <ScrollArea className="h-36 rounded-xl border border-border p-3 bg-muted/20 text-xs font-mono">
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground">
                    {buildDocumentHtml().text}
                  </pre>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            {lang === "ar" ? "إغلاق" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
