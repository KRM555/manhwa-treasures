import { useRef } from 'react';
import { TranslationConfig } from '@/types/manga';
import { Upload, FileArchive, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import JSZip from 'jszip';

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
  lang?: 'ar' | 'en';
}

const UI_TEXT = {
  ar: {
    dropTitle: 'اسحب وأسقط صفحات المانجا / الويب تون هنا',
    dropSubtitle: 'يدعم رفع حتى 10 صور دفعة واحدة أو ملف مضغوط ZIP (PNG, JPG, WEBP)',
    uploadBtn: 'اختر صوراً أو ملف ZIP',
    controlsTitle: 'إعدادات الترجمة والاستخراج',
    targetLang: 'اللغة المستهدفة للترجمة',
    sfxLabel: 'استخراج المؤثرات الصوتية (SFX)',
    sfxSub: 'ترجمة المؤثرات الجانبية مثل (Boom, Splash) بجانب نصوص الحوارات',
    verticalLabel: 'كشف النص العمودي وتحديد اتجاه القراءة تلقائياً',
    verticalSub: 'فحص اتجاه قراءة المانجا اليابانية (من اليمين لليسار)',
    analyzeBtn: 'تحليل واستخراج النصوص',
    analyzingBtn: 'جاري المعالجة بواسطة Gemini...',
    infoNote: 'يتم المعالجة والتعرف الضوئي (OCR) والترجمة في خطوة واحدة ذكية.',
  },
  en: {
    dropTitle: 'Drag & Drop your Manga / Manhwa pages',
    dropSubtitle: 'Supports uploading up to 10 images or a ZIP archive (PNG, JPG, WEBP, ZIP)',
    uploadBtn: 'Upload Images or ZIP',
    controlsTitle: 'Translation & Extraction Controls',
    targetLang: 'TARGET LANGUAGE',
    sfxLabel: 'Extract Sound Effects (SFX)',
    sfxSub: 'Translates onomatopoeia alongside speech bubbles',
    verticalLabel: 'Vertical Text & Right-to-Left Auto Detect',
    verticalSub: 'Automatically scans vertical manga reading flow',
    analyzeBtn: 'Analyze Image',
    analyzingBtn: 'Analyzing with Gemini...',
    infoNote: 'Processes OCR, Text Inpainting & Translation in a single step.',
  },
};

export function UploadZone({
  imagePreview,
  config,
  isAnalyzing,
  onImageSelected,
  onMultipleImagesSelected,
  onConfigChange,
  onAnalyze,
  lang = 'ar',
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = UI_TEXT[lang];

  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    const zipFile = fileList.find((f) => f.name.endsWith('.zip') || f.type.includes('zip'));

    if (zipFile) {
      try {
        toast.info(lang === 'ar' ? 'جاري فك الملف المضغوط...' : 'Extracting ZIP file...');
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        const extractedImages: { url: string; name: string }[] = [];

        const entries = Object.keys(zipContent.files).filter((filename) =>
          /\.(jpg|jpeg|png|webp)$/i.test(filename)
        );

        if (entries.length === 0) {
          toast.error(lang === 'ar' ? 'لم يتم العثور على صور داخل ZIP' : 'No images found inside ZIP');
          return;
        }

        const selectedEntries = entries.slice(0, 10);
        for (const entryName of selectedEntries) {
          const fileData = await zipContent.files[entryName].async('base64');
          const ext = entryName.split('.').pop()?.toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          extractedImages.push({
            url: `data:${mime};base64,${fileData}`,
            name: entryName,
          });
        }

        if (onMultipleImagesSelected) {
          onMultipleImagesSelected(extractedImages);
        } else if (extractedImages.length > 0) {
          onImageSelected(extractedImages[0].url, extractedImages[0].name);
        }
        toast.success(
          lang === 'ar'
            ? `تم استخراج ${extractedImages.length} صور من الملف المضغوط!`
            : `Extracted ${extractedImages.length} images from ZIP!`
        );
      } catch (err) {
        toast.error(lang === 'ar' ? 'تعذر قراءة ملف ZIP' : 'Failed to read ZIP file');
      }
      return;
    }

    const imageFiles = fileList.filter((f) => f.type.startsWith('image/')).slice(0, 10);
    if (imageFiles.length === 0) return;

    if (imageFiles.length === 1) {
      const file = imageFiles[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelected(e.target.result as string, file.name);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const loadedImages: { url: string; name: string }[] = [];
      let readCount = 0;

      imageFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            loadedImages.push({ url: e.target.result as string, name: file.name });
          }
          readCount++;
          if (readCount === imageFiles.length) {
            if (onMultipleImagesSelected) {
              onMultipleImagesSelected(loadedImages);
            }
          }
        };
        reader.readAsDataURL(file);
      });
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
        <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
          <Upload className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t.dropTitle}</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{t.dropSubtitle}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.zip"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />

        <div className="flex justify-center gap-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 text-sm px-6 h-11 rounded-xl shadow-md"
          >
            <FileArchive className="w-4 h-4" />
            {t.uploadBtn}
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-border rounded-2xl space-y-6 bg-card">
        <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>
          {t.controlsTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">{t.targetLang}</label>
            <Select
              value={config.targetLanguage}
              onValueChange={(val) => onConfigChange({ targetLanguage: val })}
            >
              <SelectTrigger className="h-10 text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
                <SelectItem value="en">الإنجليزية (English)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
              <Checkbox
                id="sfx"
                checked={config.extractSFX}
                onCheckedChange={(checked) => onConfigChange({ extractSFX: !!checked })}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="sfx" className="text-xs font-bold cursor-pointer text-foreground block">
                  {t.sfxLabel}
                </label>
                <p className="text-[11px] text-muted-foreground">{t.sfxSub}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
              <Checkbox
                id="vertical"
                checked={config.detectVerticalText}
                onCheckedChange={(checked) => onConfigChange({ detectVerticalText: !!checked })}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="vertical" className="text-xs font-bold cursor-pointer text-foreground block">
                  {t.verticalLabel}
                </label>
                <p className="text-[11px] text-muted-foreground">{t.verticalSub}</p>
              </div>
            </div>
          </div>
        </div>

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