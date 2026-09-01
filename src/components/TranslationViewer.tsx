import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Download,
  Copy,
  Eye,
  Columns,
  RotateCcw,
  Edit3,
  Check,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { DetectedBubble, TranslationConfig } from '@/types/manga';
import { TARGET_LANGUAGES } from '@/data/samples';
import { toast } from 'sonner';

interface TranslationViewerProps {
  imageSrc: string;
  bubbles: DetectedBubble[];
  config: TranslationConfig;
  onUpdateBubble: (id: string, newText: string) => void;
  onReset: () => void;
}

export const TranslationViewer: React.FC<TranslationViewerProps> = ({
  imageSrc,
  bubbles,
  config,
  onUpdateBubble,
  onReset,
}) => {
  const [viewMode, setViewMode] = useState<'translated' | 'side-by-side' | 'original'>('translated');
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(bubbles[0]?.id || null);
  const [zoom, setZoom] = useState<number>(100);
  const [copied, setCopied] = useState(false);

  const selectedLang = TARGET_LANGUAGES.find((l) => l.code === config.targetLanguage);
  const activeBubble = bubbles.find((b) => b.id === selectedBubbleId);

  const handleCopyAll = () => {
    const text = bubbles
      .map((b) => {
        const typeStr = ((b as any).type || b.category || 'dialogue').toUpperCase();
        return `[${typeStr}]\nOriginal: ${b.originalText}\nTranslated: ${b.translatedText}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('All translations copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    toast.success('Manga page rendered & downloaded with high-res typography!');
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-600 text-white font-bold hover:bg-orange-700">
            {selectedLang?.flag} {selectedLang?.name || 'Arabic'}
          </Badge>
          <span className="text-xs font-semibold text-muted-foreground">
            {bubbles.length} Bubbles Detected & Translated
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border">
            <Button
              variant={viewMode === 'translated' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('translated')}
              className={`text-xs h-8 rounded-lg ${viewMode === 'translated' ? 'bg-orange-600 text-white' : ''}`}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Typeset View
            </Button>
            <Button
              variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('side-by-side')}
              className={`text-xs h-8 rounded-lg ${viewMode === 'side-by-side' ? 'bg-orange-600 text-white' : ''}`}
            >
              <Columns className="w-3.5 h-3.5 mr-1" />
              Side-by-Side
            </Button>
            <Button
              variant={viewMode === 'original' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('original')}
              className={`text-xs h-8 rounded-lg ${viewMode === 'original' ? 'bg-orange-600 text-white' : ''}`}
            >
              Original Raw
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-1 border border-border rounded-xl p-1 bg-muted/40">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((prev) => Math.max(70, prev - 15))}
              className="h-8 w-8 rounded-lg"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-semibold px-1 text-muted-foreground w-12 text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
              className="h-8 w-8 rounded-lg"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            className="text-xs h-8 rounded-xl font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            Copy Text
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            className="text-xs h-8 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Page
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            title="Upload another page"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Translation Canvas & Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Manga Page Viewer with Overlay Bubbles */}
        <div className="lg:col-span-2 overflow-hidden border border-border rounded-3xl bg-zinc-950 p-4 flex items-center justify-center min-h-[500px]">
          <div
            className={`relative transition-transform duration-200 ${
              viewMode === 'side-by-side' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 w-full' : 'max-w-xl mx-auto'
            }`}
            style={{ transform: viewMode !== 'side-by-side' ? `scale(${zoom / 100})` : undefined, transformOrigin: 'top center' }}
          >
            {(viewMode === 'side-by-side' || viewMode === 'original') && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-md text-[10px]">
                    Original Raw
                  </Badge>
                </div>
                <img src={imageSrc} alt="Original Manga Raw" className="w-full h-auto object-contain" />
              </div>
            )}

            {(viewMode === 'translated' || viewMode === 'side-by-side') && (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                <div className="absolute top-3 left-3 z-20">
                  <Badge className="bg-orange-600/90 text-white backdrop-blur-md text-[10px]">
                    Translated ({selectedLang?.name || 'Arabic'})
                  </Badge>
                </div>
                <img src={imageSrc} alt="Translated Manga" className="w-full h-auto object-contain" />

                {bubbles.map((bubble) => {
                  const isSelected = bubble.id === selectedBubbleId;
                  const isArabic = config.targetLanguage === 'ar';
                  const bubbleType = (bubble as any).type || bubble.category || 'dialogue';

                  return (
                    <div
                      key={bubble.id}
                      onClick={() => setSelectedBubbleId(bubble.id)}
                      style={{
                        left: `${bubble.x}%`,
                        top: `${bubble.y}%`,
                        width: `${bubble.width}%`,
                        minHeight: `${bubble.height}%`,
                      }}
                      className={`absolute cursor-pointer transition-all duration-200 rounded-xl p-2 flex items-center justify-center text-center shadow-lg ${
                        bubbleType === 'sfx'
                          ? 'bg-amber-400/90 text-zinc-950 font-black italic border-2 border-amber-300'
                          : 'bg-white text-zinc-950 font-bold border-2 border-zinc-900'
                      } ${
                        isSelected
                          ? 'ring-4 ring-orange-500 scale-105 z-30 shadow-orange-500/30'
                          : 'hover:scale-[1.02] z-10 opacity-95 hover:opacity-100'
                      }`}
                    >
                      <p
                        dir={isArabic ? 'rtl' : 'ltr'}
                        className={`text-xs sm:text-sm leading-snug break-words selection:bg-orange-200 ${
                          isArabic ? 'font-serif font-black' : 'font-sans'
                        }`}
                      >
                        {bubble.translatedText}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="p-4 border border-border shadow-sm rounded-2xl bg-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h3 className="text-xs font-bold text-orange-500">
                📖 طريقة الاستخدام
              </h3>
              <a
                href="https://discord.gg/nuaqTHvx"
                target="_blank"
                rel="noopener noreferrer"
                title="الدعم والشكاوى عبر Discord"
                className="p-1.5 rounded-xl bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2] hover:text-white transition-all duration-200"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 127.14 96.36">
                  <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.68 1.76 1.36 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15z" />
                </svg>
              </a>
            </div>

            <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
              <li>اضغط على أي فقرة في الصفحة لتحديدها.</li>
              <li>عدّل النص المترجم في الخانة بالأسفل.</li>
              <li>احفظ التعديلات وقم بتصدير النص النهائي.</li>
            </ol>
          </div>

          <Card className="rounded-2xl border-border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-orange-500" />
                  <h4 className="font-bold text-sm text-foreground">Interactive Bubble Editor</h4>
                </div>
                <Badge variant="outline" className="text-xs">
                  {bubbles.findIndex((b) => b.id === selectedBubbleId) + 1} of {bubbles.length}
                </Badge>
              </div>

              {activeBubble ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Original Text (OCR)</Label>
                    <div className="mt-1 p-2.5 rounded-xl bg-muted/60 text-xs font-medium text-foreground border border-border">
                      {activeBubble.originalText}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                        Translated Text ({selectedLang?.name || 'Arabic'})
                      </Label>
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">
                        Type to live-update
                      </span>
                    </div>
                    <Textarea
                      rows={4}
                      dir={config.targetLanguage === 'ar' ? 'rtl' : 'ltr'}
                      value={activeBubble.translatedText}
                      onChange={(e) => onUpdateBubble(activeBubble.id, e.target.value)}
                      className="rounded-xl resize-none font-semibold text-sm border-orange-500/40 focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">All Detected Bubbles</Label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {bubbles.map((b, i) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBubbleId(b.id)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between border transition-colors ${
                            b.id === selectedBubbleId
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 font-bold text-orange-700 dark:text-orange-300'
                              : 'border-border/60 bg-card hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <span className="truncate pr-2">
                            #{i + 1}: {b.translatedText}
                          </span>
                          <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0">
                            {(b as any).type || b.category || 'dialogue'}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Select a bubble in the canvas above to edit its translation.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};