import React, { useState } from "react";
import {
  Link2,
  CloudDownload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileArchive,
  FolderArchive,
  ExternalLink,
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

  const parsedInfo = parseDriveOrDirectLink(driveUrl);

  const handleImport = async () => {
    const trimmed = driveUrl.trim();
    if (!trimmed) {
      toast.error(lang === "ar" ? "يرجى لصق الرابط أولاً" : "Please paste a link first");
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
        throw new Error(
          data.error || (lang === "ar" ? "فشل استيراد الرابط" : "Failed to import link"),
        );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-orange-600">
            <CloudDownload className="w-5 h-5 text-orange-500" />
            <span>
              {lang === "ar"
                ? "استيراد الصور من Google Drive أو الرابط"
                : "Import Images from Google Drive / Link"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "يمكنك لصق رابط ملف ZIP أو مجلد صور على Google Drive، أو رابط مباشر من Dropbox، وسيتم جلب الصور وفك ضغطها فوراً داخل مساحة العمل دون الحاجة لتنزيلها على جهازك."
              : "Paste a Google Drive ZIP file or folder link, or a Dropbox link. The images will be fetched and unpacked straight into your workspace without downloading to your computer."}
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>
                {lang === "ar" ? "رابط Google Drive / الرابط المباشر:" : "Drive / Direct Link:"}
              </span>
              {parsedInfo && (
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  {parsedInfo.type === "drive_file" && (
                    <>
                      <FileArchive className="w-3 h-3" />
                      {lang === "ar" ? "ملف Google Drive" : "Drive File"}
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
                    ? "https://drive.google.com/file/d/... أو https://drive.google.com/drive/folders/..."
                    : "https://drive.google.com/file/d/... or folders/..."
                }
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleImport()}
                className="h-10 text-xs dir-ltr pl-8"
                disabled={isLoading}
              />
              <Link2 className="w-4 h-4 text-muted-foreground absolute left-2.5 top-3" />
            </div>
          </div>

          {/* تنبيه مهم حول إذن المشاركة */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1 text-[11px] text-foreground">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {lang === "ar" ? "تأكد من إعدادات مشاركة الرابط:" : "Important Sharing Settings:"}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed pr-5 pl-5">
              {lang === "ar"
                ? "يجب أن يكون خيار المشاركة مضبوطاً على 'أي شخص لديه الرابط يمكنه العرض' (Anyone with the link can view) حتى يتمكن الخادم من قراءة الصور."
                : "The link must be set to 'Anyone with the link can view' so the server can fetch the images."}
            </p>
          </div>

          {statusMessage && (
            <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-xs font-medium text-orange-600 dark:text-orange-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
                <span>{lang === "ar" ? "استيراد الصور الآن" : "Import Now"}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
