import React, { useState, useRef } from "react";
import {
  Link2,
  CloudDownload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileArchive,
  FolderArchive,
  Upload,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/language";
import { parseDriveOrDirectLink } from "@/lib/driveUtils";
import { filterZipEntries, sortImageNames } from "@/lib/zipUtils";
import JSZip from "jszip";
import { toast } from "sonner";

interface DriveImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImagesImported: (images: { url: string; name: string }[]) => void;
}

export const DriveImportModal: React.FC<DriveImportModalProps> = ({
  open,
  onOpenChange,
  onImagesImported,
}) => {
  const { t, lang } = useI18n();
  const [driveUrl, setDriveUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsedInfo = parseDriveOrDirectLink(driveUrl);
  const isFolder = parsedInfo?.type === "drive_folder";

  const handleImport = async () => {
    const trimmed = driveUrl.trim();
    if (!trimmed) {
      toast.error(lang === "ar" ? "يرجى لصق الرابط أولاً" : "Please paste a link first");
      return;
    }

    setLastError(null);

    // If it's a folder, explain immediately and offer the ZIP solution
    if (isFolder) {
      const folderMsg =
        lang === "ar"
          ? "تنبيه: هذا رابط مجلد (Folder). تمنع سياسة أمان Google Drive المواقع الخارجية من تصفح المجلدات المفتوحة مباشرة.\n\n💡 الحل السهل: اضغط كليك يمين على المجلد في Google Drive ثم اختر «تنزيل» (Download) ليتم حفظه كملف ZIP، ثم اختر ملف الـ ZIP من جهازك بالأسفل وسيبدأ الاستيراد فوراً!"
          : "Google Drive prevents third-party apps from scraping uncompressed folders directly. Solution: Right-click the folder in Google Drive > 'Download' as ZIP, then choose that ZIP file below!";
      setLastError(folderMsg);
      toast.info(
        lang === "ar"
          ? "روابط المجلدات غير مدعومة مباشرة؛ يرجى تنزيل المجلد كـ ZIP ورفعه هنا"
          : "Folders cannot be read directly; please download as ZIP and upload below",
      );
      return;
    }

    setIsLoading(true);
    setStatusMessage(
      lang === "ar" ? "جارٍ الاتصال بالسحابة وتحميل الصور..." : "Connecting and fetching images...",
    );

    try {
      const res = await fetch("/api/import-drive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg =
          data.error || (lang === "ar" ? "فشل استيراد الرابط" : "Failed to import link");
        setLastError(errMsg);
        throw new Error(errMsg);
      }

      if (data.images && data.images.length > 0) {
        onImagesImported(data.images);
        toast.success(
          lang === "ar"
            ? `تم استيراد ${data.images.length} صفحة بنجاح!`
            : `Successfully imported ${data.images.length} pages!`,
        );
        onOpenChange(false);
        setDriveUrl("");
        setLastError(null);
      } else {
        throw new Error(
          lang === "ar" ? "لم يتم العثور على صور في الرابط" : "No images found in link",
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Error importing from link");
    } finally {
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  const handleLocalZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLastError(null);
    setStatusMessage(
      lang === "ar" ? "جارٍ فك ضغط ملف ZIP واستخراج الصور..." : "Extracting images from ZIP...",
    );

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      const entries = filterZipEntries(Object.keys(zipContent.files));

      if (entries.length === 0) {
        throw new Error(
          lang === "ar"
            ? "الملف المضغوط لا يحتوي على أية صور مدعومة (JPG, PNG, WEBP)."
            : "The ZIP archive does not contain supported images (JPG, PNG, WEBP).",
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
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        images.push({
          name: entryName.split("/").pop() || entryName,
          url: `data:${mime};base64,${fileB64}`,
        });
      }

      onImagesImported(images);
      toast.success(
        lang === "ar"
          ? `تم استيراد ${images.length} صفحة من ملف الـ ZIP بنجاح!`
          : `Successfully imported ${images.length} pages from ZIP!`,
      );
      onOpenChange(false);
      setDriveUrl("");
    } catch (err: any) {
      toast.error(err.message || "Failed to process ZIP");
      setLastError(err.message);
    } finally {
      setIsLoading(false);
      setStatusMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-orange-600">
            <CloudDownload className="w-5 h-5 text-orange-500 shrink-0" />
            <span>
              {lang === "ar"
                ? "استيراد فصول المانجا من Google Drive / ZIP"
                : "Import Chapters from Google Drive / ZIP"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* رابط التحميل */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>
                {lang === "ar" ? "رابط الملف من Google Drive:" : "Google Drive File Link:"}
              </span>
              {parsedInfo && (
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  {parsedInfo.type === "drive_file" && (
                    <>
                      <FileArchive className="w-3 h-3" />
                      {lang === "ar" ? "ملف Drive (ZIP أو صورة)" : "Drive File"}
                    </>
                  )}
                  {parsedInfo.type === "drive_folder" && (
                    <>
                      <FolderArchive className="w-3 h-3" />
                      {lang === "ar" ? "مجلد Google Drive" : "Drive Folder"}
                    </>
                  )}
                  {parsedInfo.type === "dropbox" && <>Dropbox Link</>}
                  {parsedInfo.type === "direct" && <>Direct URL</>}
                </span>
              )}
            </label>

            <div className="relative">
              <Input
                type="url"
                placeholder={
                  lang === "ar"
                    ? "https://drive.google.com/file/d/..."
                    : "https://drive.google.com/file/d/..."
                }
                value={driveUrl}
                onChange={(e) => {
                  setDriveUrl(e.target.value);
                  setLastError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleImport()}
                className="h-10 text-xs dir-ltr pl-8"
                disabled={isLoading}
              />
              <Link2 className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          {/* تنبيه خاص إذا تم لصق رابط مجلد */}
          {isFolder && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2 text-xs text-foreground animate-in fade-in">
              <div className="flex items-start gap-2 font-bold text-amber-600 dark:text-amber-400">
                <FolderArchive className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {lang === "ar"
                    ? "هذا رابط مجلد (Folder) — Google لا تسمح بتصفح المجلدات مباشرة"
                    : "Folder links cannot be read directly due to Google Drive policies"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "تمنع جوجل درايف المواقع من قراءة المجلدات المفتوحة مباشرة دون حساب. يمكنك ببساطة تنزيل المجلد كملف ZIP ورفعه بالأسفل فوراً:"
                  : "Google blocks third-party direct folder browsing. You can download the folder as a ZIP from Drive and pick it below:"}
              </p>
              <div className="bg-background/80 rounded-lg p-2.5 text-[11px] space-y-1 font-medium border border-border/50">
                <p>
                  1. في Google Drive: اضغط كليك يمين على المجلد واختر{" "}
                  <strong>«تنزيل» (Download)</strong>.
                </p>
                <p>2. سيتم حفظ المجلد كملف ZIP على جهازك خلال ثوانٍ.</p>
                <p>
                  3. اضغط على زر <strong>«اختيار ملف ZIP من جهازك»</strong> بالأسفل وسيتم فتحه
                  فوراً!
                </p>
              </div>
            </div>
          )}

          {/* خيار رفع ملف الـ ZIP مباشرة من الجهاز */}
          <div className="relative border-2 border-dashed border-orange-500/30 hover:border-orange-500/60 bg-orange-500/5 transition-colors rounded-xl p-3.5 text-center cursor-pointer group">
            <input
              type="file"
              ref={fileInputRef}
              accept=".zip,application/zip"
              onChange={handleLocalZipUpload}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              title=""
            />
            <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground">
                {lang === "ar"
                  ? "أو اختر ملف ZIP من جهازك فوراً (أسرع وأضمن طريقة)"
                  : "Or choose a ZIP file from your device (fastest & reliable)"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {lang === "ar"
                  ? "يتم فك الضغط داخل المتصفح مباشرة ودون انتظار"
                  : "Extracted immediately in your browser"}
              </p>
            </div>
          </div>

          {/* رسالة الخطأ إن وجدت */}
          {lastError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1.5 text-xs text-destructive">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lang === "ar" ? "تنبيه" : "Notice"}</span>
              </div>
              <p className="text-[11px] leading-relaxed whitespace-pre-line text-foreground">
                {lastError}
              </p>
            </div>
          )}

          {/* تنبيه مهم حول إذن المشاركة */}
          <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-1 text-[11px] text-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 text-orange-500" />
              <span>
                {lang === "ar"
                  ? "كيفية مشاركة ملف ZIP على Google Drive:"
                  : "Sharing a ZIP on Google Drive:"}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed pr-5 pl-5">
              {lang === "ar"
                ? "ارفع ملف الـ ZIP إلى درايف > كليك يمين > مشاركة > تأكد من اختيار «أي شخص لديه الرابط» (Anyone with the link) وليس «حصري» (Restricted)."
                : "Upload your ZIP to Drive > Right click > Share > Make sure it is set to 'Anyone with the link'."}
            </p>
          </div>

          {statusMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs font-medium text-orange-600 dark:text-orange-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-xs h-9 rounded-xl"
          >
            {t.close}
          </Button>

          <Button
            onClick={handleImport}
            disabled={isLoading || !driveUrl.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === "ar" ? "جارٍ الجلب..." : "Importing..."}</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "استيراد الرابط الآن" : "Import Link Now"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
