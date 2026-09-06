import { useRef, useState } from "react";
import { TranslationConfig } from "@/types/manga";
import {
  Upload,
  FileArchive,
  Sparkles,
  CloudDownload,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import JSZip from "jszip";
import { useI18n } from "@/lib/language";
import {
  sortImageNames,
  hasPageNumber,
  filterZipEntries,
  compareImageFilenames,
} from "@/lib/zipUtils";
import { DriveImportModal } from "./DriveImportModal";

interface UploadZoneProps {
  imagePreview: string | null;
  fileName: string | null;
  config: TranslationConfig;
  isAnalyzing: boolean;
  onImageSelected: (url: string, name: string) => void;
  onMultipleImagesSelected?: (images: { url: string; name: string }[]) => void;
  onClearImage: () => void;
  onConfigChange: (updated: Partial<TranslationConfig>) => void;
  onAnalyze: () => void;
}

export function UploadZone({
  imagePreview,
  config,
  isAnalyzing,
  onImageSelected,
  onMultipleImagesSelected,
  onConfigChange,
  onAnalyze,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, lang } = useI18n();
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const zipFile = fileList.find((f) => f.name.endsWith(".zip") || f.type.includes("zip"));

    if (zipFile) {
      try {
        toast.info(t.zipExtracting);
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        const extractedImages: { url: string; name: string }[] = [];

        const entries = filterZipEntries(Object.keys(zipContent.files));

        if (entries.length === 0) {
          toast.error(t.zipNoImages);
          return;
        }

        const sortedEntries = sortImageNames(entries);
        if (entries.some((entry, index) => entry !== sortedEntries[index])) {
          toast.warning("تم ترتيب صور ZIP تلقائيًا حسب أسماء الملفات. راجع الترتيب قبل التحليل.");
        }
        if (sortedEntries.some((entry) => !hasPageNumber(entry))) {
          toast.warning("بعض أسماء الملفات لا تحتوي على رقم صفحة واضح؛ راجع الترتيب يدويًا.");
        }

        const MAX_ZIP_IMAGES = 25;
        if (sortedEntries.length > MAX_ZIP_IMAGES) {
          toast.info(`تم تحديد أول ${MAX_ZIP_IMAGES} صورة من ملف الـ ZIP حسب الحد الأقصى.`);
        }
        const selectedEntries = sortedEntries.slice(0, MAX_ZIP_IMAGES);
        for (const entryName of selectedEntries) {
          const fileData = await zipContent.files[entryName]!.async("base64");
          const ext = entryName.split(".").pop()?.toLowerCase() || "jpeg";
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          extractedImages.push({
            url: `data:${mime};base64,${fileData}`,
            name: entryName,
          });
        }

        // Keep extracted images sorted naturally
        extractedImages.sort((a, b) => compareImageFilenames(a.name, b.name));

        if (onMultipleImagesSelected) {
          onMultipleImagesSelected(extractedImages);
        } else if (extractedImages.length > 0) {
          onImageSelected(extractedImages[0]!.url, extractedImages[0]!.name);
        }
        toast.success(t.zipExtracted(extractedImages.length));
      } catch (err) {
        toast.error(t.zipFailed);
      }
      return;
    }

    const allImages = fileList
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) => compareImageFilenames(a.name, b.name));

    const MAX_DIRECT_IMAGES = 25;
    if (allImages.length > MAX_DIRECT_IMAGES) {
      toast.info(`تم تحديد أول ${MAX_DIRECT_IMAGES} صورة حسب الحد الأقصى.`);
    }

    const imageFiles = allImages.slice(0, MAX_DIRECT_IMAGES);
    if (imageFiles.length === 0) return;

    if (imageFiles.some((file) => !hasPageNumber(file.name))) {
      toast.warning("بعض أسماء الملفات لا تحتوي على رقم صفحة واضح؛ راجع الترتيب يدويًا.");
    }

    if (imageFiles.length === 1) {
      const file = imageFiles[0]!;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelected(e.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const loadedImages = await Promise.all(
          imageFiles.map(
            (file) =>
              new Promise<{ url: string; name: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  if (e.target?.result) {
                    resolve({ url: e.target.result as string, name: file.name });
                  } else {
                    reject(new Error("Failed to read file"));
                  }
                };
                reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
                reader.readAsDataURL(file);
              }),
          ),
        );

        // Guarantee strict natural order
        loadedImages.sort((a, b) => compareImageFilenames(a.name, b.name));

        if (onMultipleImagesSelected) {
          onMultipleImagesSelected(loadedImages);
        }
      } catch (err) {
        toast.error("فشل في قراءة بعض ملفات الصور، يرجى المحاولة مرة أخرى.");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="p-8 sm:p-12 border-2 border-dashed border-border hover:border-orange-500/50 bg-card/50 transition-colors rounded-3xl text-center space-y-4"
      >
        {imagePreview ? (
          <div className="w-full max-w-md mx-auto space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-md">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-[400px] object-contain bg-muted/20"
              />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold tracking-tight text-foreground">{t.dropTitle}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t.dropSubtitle}</p>
            </div>
          </div>
        ) : (
          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8" />
          </div>
        )}

        {!imagePreview && (
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{t.dropTitle}</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{t.dropSubtitle}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.zip"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />

        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 text-sm px-6 h-11 rounded-xl shadow-md"
          >
            <FileArchive className="w-4 h-4" />
            {t.uploadBtn}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDriveModal(true)}
            className="border-orange-500/40 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold gap-2 text-sm px-5 h-11 rounded-xl shadow-sm"
          >
            <CloudDownload className="w-4 h-4 text-orange-500" />
            {lang === "ar" ? "رابط Google Drive / سحابي" : "Google Drive Link"}
          </Button>
        </div>

        <DriveImportModal
          open={showDriveModal}
          onOpenChange={setShowDriveModal}
          onImagesImported={(importedImages) => {
            if (onMultipleImagesSelected) {
              onMultipleImagesSelected(importedImages);
            } else if (importedImages.length > 0) {
              onImageSelected(importedImages[0]!.url, importedImages[0]!.name);
            }
          }}
        />
      </Card>

      <Card className="p-5 sm:p-6 border-border rounded-2xl space-y-5 bg-card">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            {t.controlsTitle}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className={`h-8 px-2.5 text-xs font-bold gap-1.5 rounded-xl transition-colors ${
              showAdvancedSettings
                ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
            <span>{lang === "ar" ? "إعدادات متقدمة" : "Advanced"}</span>
            {showAdvancedSettings ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* الإعداد الأساسي: لغة الترجمة */}
        <div className="space-y-2 max-w-sm">
          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <span>{t.targetLang}</span>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold lowercase">
              ({lang === "ar" ? "إعداد أساسي" : "required"})
            </span>
          </label>
          <Select
            value={config.targetLanguage}
            onValueChange={(val) => onConfigChange({ targetLanguage: val })}
          >
            <SelectTrigger className="h-10 text-xs font-bold rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">{t.langArabic}</SelectItem>
              <SelectItem value="en">{t.langEnglish}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* لوحة الإعدادات المتقدمة (قابلة للفتح والإغلاق) */}
        {showAdvancedSettings && (
          <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3 animate-in fade-in-50 duration-200">
            <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-orange-500" />
              <span>
                {lang === "ar"
                  ? "خيارات دقيقة لاستخراج النصوص والمؤثرات الصوتية:"
                  : "Granular text extraction & OCR options:"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* SFX */}
              <div className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-sm">
                <Checkbox
                  id="sfx"
                  checked={config.extractSFX}
                  onCheckedChange={(checked) => onConfigChange({ extractSFX: !!checked })}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="sfx"
                    className="text-xs font-bold cursor-pointer text-foreground flex items-center gap-1.5"
                  >
                    <span>{t.sfxLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-normal">
                      SFX
                    </span>
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {lang === "ar"
                      ? "استخراج المؤثرات الصوتية والكلمات خارج الفقاعات وتصنيفها في ملف التصدير."
                      : t.sfxSub}
                  </p>
                </div>
              </div>

              {/* Vertical Text */}
              <div className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border/70 shadow-sm">
                <Checkbox
                  id="vertical"
                  checked={config.detectVerticalText}
                  onCheckedChange={(checked) => onConfigChange({ detectVerticalText: !!checked })}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="vertical"
                    className="text-xs font-bold cursor-pointer text-foreground flex items-center gap-1.5"
                  >
                    <span>{t.verticalLabel}</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {lang === "ar"
                      ? "تحسين ترتيب الأحرف والكلمات المكتوبة بشكل عمودي (رأسي) في المانجا اليابانية."
                      : t.verticalSub}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            {t.infoNote}
          </p>

          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing || !imagePreview}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-8 rounded-xl gap-2 shadow-lg shadow-orange-500/10"
          >
            {isAnalyzing ? t.analyzingBtn : t.analyzeBtn}
          </Button>
        </div>
      </Card>
    </div>
  );
}
