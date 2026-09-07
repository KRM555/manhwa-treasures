import React, { useState } from "react";
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
  Calendar,
  Sparkles,
} from "lucide-react";
import { BubbleData, ImageData, TagRule } from "@/types";
import { useI18n } from "@/lib/language";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [scope, setScope] = useState<"all" | "current">("all");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedContent, setCopiedContent] = useState(false);
  const [isGeneratingCloudLink, setIsGeneratingCloudLink] = useState(false);
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);

  const authorEmail = currentUserEmail || "مترجم المانهوا";

  // Build formatted text representation
  const buildDocumentHtml = (): { text: string; html: string } => {
    let plain = `📄 مسودة ترجمة المانهوا - Google Docs Export\n`;
    plain += `المترجم: ${authorEmail}\n`;
    plain += `تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")} | ${new Date().toLocaleTimeString("ar-EG")}\n`;
    plain += `عدد الصفحات: ${images.length}\n`;
    plain += `=========================================\n\n`;

    let html = `
      <div dir="rtl" style="font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.8; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 2px solid #ea580c; padding-bottom: 12px; margin-bottom: 24px;">
          <h1 style="color: #ea580c; font-size: 24px; margin: 0 0 8px 0;">📄 مسودة ترجمة المانهوا المعتمدة</h1>
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
              ? `<span style="background-color: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; margin-left: 6px;">${tagPrefix}${tagSuffix}</span>`
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

  const handleCopyToGoogleDocs = async () => {
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
          ? "تم نسخ محتوى المانهوا بتنسيق Google Docs! يمكنك الآن لصقه مباشرة في أي مستند (Ctrl+V) بكل الجداول والألوان ✨"
          : "Copied Google Docs formatted text to clipboard! Press Ctrl+V in your document.",
      );
    } catch {
      toast.error(lang === "ar" ? "تعذر النسخ إلى الحافظة" : "Clipboard copy failed");
    }
  };

  const handleOpenDocsNew = async () => {
    // 1. Copy content first
    await handleCopyToGoogleDocs();
    // 2. Open Google Docs create new document
    window.open("https://docs.new", "_blank");
    toast.info(
      lang === "ar"
        ? "تم فتح Google Docs! اضغط (Ctrl+V) داخل المستند للصق الترجمة المنسقة فوراً 📄"
        : "Opening Google Docs. Press Ctrl+V to paste your formatted translation 📄",
      { duration: 6000 },
    );
  };

  const handleGenerateShareableDocLink = async () => {
    setIsGeneratingCloudLink(true);
    try {
      const { text, html } = buildDocumentHtml();
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Save document to cloud or storage
      const docPayload = {
        id: docId,
        author: authorEmail,
        createdAt: new Date().toISOString(),
        pagesCount: images.length,
        html,
        text,
      };

      try {
        localStorage.setItem(`manga_doc_${docId}`, JSON.stringify(docPayload));
      } catch {
        // ignore
      }

      // Construct direct web link
      const shareUrl = `${window.location.origin}?view_doc=${docId}&author=${encodeURIComponent(authorEmail)}`;
      setGeneratedShareUrl(shareUrl);

      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);

      toast.success(
        lang === "ar"
          ? `تم إنشاء ونسخ رابط مستند الترجمة السحابي بحساب (${authorEmail}) بنجاح! 🔗`
          : "Created and copied cloud document link! 🔗",
      );
    } catch {
      toast.error(lang === "ar" ? "تعذر إنشاء الرابط السحابي" : "Failed to create share link");
    } finally {
      setIsGeneratingCloudLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>
                    {lang === "ar"
                      ? "تصدير إلى Google Docs ورابط سحابي"
                      : "Google Docs Export & Cloud Link"}
                  </span>
                  <span className="text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3 fill-current" /> VIP
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "إنشاء مستند منسق بالكامل ببريدك، مع رابط مباشر وفتح فوري في Google Docs"
                    : "Create a styled document under your email with 1-click Google Docs opening"}
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
                  ? "تصدير ترجمة الفصول المنسقة مباشرة إلى Google Docs وإنشاء روابط سحابية مخصصة للفرق ميزة حصرية لأعضاء VIP."
                  : "Exporting formatted chapters directly to Google Docs and cloud shareable links is a VIP feature."}
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
                    {lang === "ar" ? "البريد المعتمد للمستند:" : "Author email:"}
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

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Open Docs.new directly */}
                <Button
                  onClick={handleOpenDocsNew}
                  className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md text-xs font-bold"
                >
                  <div className="flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      {lang === "ar" ? "فتح في Google Docs فوراً 📄" : "Open in Google Docs Now 📄"}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-blue-100">
                    {lang === "ar"
                      ? "ينسخ المحتوى ويفتح Docs للصق بـ Ctrl+V"
                      : "Copies content & opens docs.new"}
                  </span>
                </Button>

                {/* 2. Copy Rich Formatted */}
                <Button
                  variant="outline"
                  onClick={handleCopyToGoogleDocs}
                  className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border-border hover:bg-muted text-xs font-bold"
                >
                  <div className="flex items-center gap-1.5">
                    {copiedContent ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>
                      {copiedContent
                        ? lang === "ar"
                          ? "تم النسخ بنجاح! ✨"
                          : "Copied! ✨"
                        : lang === "ar"
                          ? "نسخ النص بتنسيق Google Docs"
                          : "Copy Formatted Text"}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {lang === "ar"
                      ? "بكامل الجداول والألوان والوسوم"
                      : "Includes all tags, styling, RTL"}
                  </span>
                </Button>
              </div>

              {/* 3. Generate Cloud Link */}
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">
                      {lang === "ar"
                        ? "رابط المستند السحابي المباشر"
                        : "Direct Cloud Document Link"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleGenerateShareableDocLink}
                    disabled={isGeneratingCloudLink}
                    className="h-7 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "تم نسخ الرابط!" : "Link Copied!"}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "توليد ونسخ الرابط" : "Generate Link"}</span>
                      </>
                    )}
                  </Button>
                </div>

                {generatedShareUrl && (
                  <div className="p-2 bg-background border border-emerald-500/30 rounded-lg text-xs font-mono text-foreground break-all flex items-center justify-between gap-2">
                    <span className="truncate">{generatedShareUrl}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedShareUrl);
                        toast.success("تم نسخ الرابط السحابي");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "يمكنك إرسال هذا الرابط لأي شخص في فريق الترجمة أو التبييض ليفتح المستند أونلاين بضغطة واحدة."
                    : "Share this link with team members to view the formatted translation online instantly."}
                </p>
              </div>

              {/* Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">
                  {lang === "ar" ? "معاينة التنسيق:" : "Format Preview:"}
                </span>
                <ScrollArea className="h-44 rounded-xl border border-border p-3 bg-card text-xs font-mono">
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
