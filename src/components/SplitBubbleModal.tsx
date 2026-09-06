import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Split, Scissors, ArrowDown, Sparkles, Layers, ArrowUpDown, Check } from "lucide-react";
import { useI18n } from "@/lib/language";
import { getTagLabel } from "@/lib/i18n";
import { ExtractedText, TagRule } from "@/types/manga";

interface SplitBubbleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bubble: ExtractedText | null;
  bubbleIndex: number;
  tags: TagRule[];
  initialSelectedText?: string;
  onConfirmSplit: (
    bubbleId: string,
    part1: { originalText: string; translatedText: string; category: string },
    part2: { originalText: string; translatedText: string; category: string },
  ) => void;
}

export const SplitBubbleModal: React.FC<SplitBubbleModalProps> = ({
  open,
  onOpenChange,
  bubble,
  bubbleIndex,
  tags,
  initialSelectedText = "",
  onConfirmSplit,
}) => {
  const { t, lang } = useI18n();

  const [part1Original, setPart1Original] = useState("");
  const [part2Original, setPart2Original] = useState("");
  const [part1Translated, setPart1Translated] = useState("");
  const [part2Translated, setPart2Translated] = useState("");
  const [part1Category, setPart1Category] = useState("dialogue");
  const [part2Category, setPart2Category] = useState("dialogue");

  useEffect(() => {
    if (!bubble || !open) return;

    setPart1Category(bubble.category || "dialogue");
    setPart2Category(bubble.category || "dialogue");

    const orig = bubble.originalText || "";
    const trans = bubble.translatedText || "";

    // If user pre-selected text in the textarea, use that as part 2!
    if (initialSelectedText && trans.includes(initialSelectedText)) {
      const idx = trans.indexOf(initialSelectedText);
      const before = trans.slice(0, idx).trim();
      const after = trans.slice(idx + initialSelectedText.length).trim();
      const p1 = before + (after ? ` ${after}` : "");
      setPart1Translated(p1.trim());
      setPart2Translated(initialSelectedText.trim());

      // Try split original lines if multiline
      const origLines = orig.split("\n").filter((l) => l.trim().length > 0);
      if (origLines.length >= 2) {
        const mid = Math.ceil(origLines.length / 2);
        setPart1Original(origLines.slice(0, mid).join("\n"));
        setPart2Original(origLines.slice(mid).join("\n"));
      } else {
        setPart1Original(orig);
        setPart2Original("");
      }
      return;
    }

    // Default intelligent split:
    // 1. If multi-line, split lines in half
    const transLines = trans.split("\n").filter((l) => l.trim().length > 0);
    const origLines = orig.split("\n").filter((l) => l.trim().length > 0);

    if (transLines.length >= 2) {
      const mid = Math.ceil(transLines.length / 2);
      setPart1Translated(transLines.slice(0, mid).join("\n"));
      setPart2Translated(transLines.slice(mid).join("\n"));
    } else {
      // Split by sentence punctuation (., !, ?, etc.)
      const sentences = trans.split(/(?<=[.!?؟،\n])\s+/);
      if (sentences.length >= 2) {
        const mid = Math.ceil(sentences.length / 2);
        setPart1Translated(sentences.slice(0, mid).join(" "));
        setPart2Translated(sentences.slice(mid).join(" "));
      } else {
        setPart1Translated(trans);
        setPart2Translated("");
      }
    }

    if (origLines.length >= 2) {
      const mid = Math.ceil(origLines.length / 2);
      setPart1Original(origLines.slice(0, mid).join("\n"));
      setPart2Original(origLines.slice(mid).join("\n"));
    } else {
      setPart1Original(orig);
      setPart2Original("");
    }
  }, [bubble, open, initialSelectedText]);

  const handleSplitLines = () => {
    if (!bubble) return;
    const transLines = (bubble.translatedText || "").split("\n");
    if (transLines.length >= 2) {
      const mid = Math.ceil(transLines.length / 2);
      setPart1Translated(transLines.slice(0, mid).join("\n").trim());
      setPart2Translated(transLines.slice(mid).join("\n").trim());
    }

    const origLines = (bubble.originalText || "").split("\n");
    if (origLines.length >= 2) {
      const mid = Math.ceil(origLines.length / 2);
      setPart1Original(origLines.slice(0, mid).join("\n").trim());
      setPart2Original(origLines.slice(mid).join("\n").trim());
    }
  };

  const handleSplitHalves = () => {
    if (!bubble) return;
    const transWords = (bubble.translatedText || "").split(" ");
    if (transWords.length >= 2) {
      const mid = Math.ceil(transWords.length / 2);
      setPart1Translated(transWords.slice(0, mid).join(" ").trim());
      setPart2Translated(transWords.slice(mid).join(" ").trim());
    }
  };

  const handleSwapTranslated = () => {
    const tempT = part1Translated;
    setPart1Translated(part2Translated);
    setPart2Translated(tempT);

    const tempO = part1Original;
    setPart1Original(part2Original);
    setPart2Original(tempO);
  };

  const handleConfirm = () => {
    if (!bubble) return;

    onConfirmSplit(
      bubble.id,
      {
        originalText: part1Original.trim(),
        translatedText: part1Translated.trim(),
        category: part1Category,
      },
      {
        originalText: part2Original.trim(),
        translatedText: part2Translated.trim(),
        category: part2Category,
      },
    );

    onOpenChange(false);
  };

  if (!bubble) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="split-bubble-dialog"
        className="max-w-2xl rounded-2xl max-h-[92vh] flex flex-col p-5 sm:p-6"
      >
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Split className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">
              {t.splitBubbleTitle(bubbleIndex + 1)}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {t.splitBubbleDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          {/* Quick Helper Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/60">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-orange-500" />
              {lang === "ar" ? "أدوات تقسيم سريعة:" : "Quick Split Presets:"}
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSplitLines}
                className="h-7 text-[11px] font-semibold px-2.5 rounded-lg border-border"
              >
                {t.autoSplitLines}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSplitHalves}
                className="h-7 text-[11px] font-semibold px-2.5 rounded-lg border-border"
              >
                {t.autoSplitHalves}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSwapTranslated}
                className="h-7 text-[11px] font-semibold px-2 rounded-lg gap-1 text-muted-foreground hover:text-foreground"
                title={lang === "ar" ? "تبديل بين الجزأين" : "Swap Parts"}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{lang === "ar" ? "تبديل" : "Swap"}</span>
              </Button>
            </div>
          </div>

          {/* Bubble 1 Container */}
          <div className="space-y-2.5 p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-600 text-white text-[11px] font-bold px-2 py-0.5">
                  {t.splitFirstPart} (#{bubbleIndex + 1})
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground font-semibold">
                  {t.tagSettings}:
                </Label>
                <Select value={part1Category} onValueChange={setPart1Category}>
                  <SelectTrigger className="w-32 h-7 text-xs font-bold rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {tags.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value} className="text-xs font-medium">
                        {getTagLabel(tag, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  {t.splitOriginalPart1}
                </Label>
                <Textarea
                  value={part1Original}
                  onChange={(e) => setPart1Original(e.target.value)}
                  placeholder={lang === "ar" ? "النص الأصلي للفقاعة الأولى..." : "Original text..."}
                  rows={2}
                  className="text-xs dir-ltr bg-background rounded-lg resize-y focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  {t.splitTranslatedPart1}
                </Label>
                <Textarea
                  value={part1Translated}
                  onChange={(e) => setPart1Translated(e.target.value)}
                  placeholder={lang === "ar" ? "ترجمة الفقاعة الأولى..." : "Translated text..."}
                  rows={2}
                  className="text-xs font-medium bg-background rounded-lg resize-y focus-visible:ring-1 focus-visible:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Separation indicator */}
          <div className="flex items-center justify-center -my-1 text-muted-foreground">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/60 rounded-full text-[11px] font-bold border border-border">
              <ArrowDown className="w-3.5 h-3.5 text-orange-500" />
              <span>
                {lang === "ar"
                  ? "يتم إنشاء فقاعة ثانية تليها مباشرة"
                  : "New connected bubble created below"}
              </span>
            </div>
          </div>

          {/* Bubble 2 Container */}
          <div className="space-y-2.5 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5">
                  {t.splitSecondPart} (#{bubbleIndex + 2})
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[11px] text-muted-foreground font-semibold">
                  {t.tagSettings}:
                </Label>
                <Select value={part2Category} onValueChange={setPart2Category}>
                  <SelectTrigger className="w-32 h-7 text-xs font-bold rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {tags.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value} className="text-xs font-medium">
                        {getTagLabel(tag, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">
                  {t.splitOriginalPart2}
                </Label>
                <Textarea
                  value={part2Original}
                  onChange={(e) => setPart2Original(e.target.value)}
                  placeholder={
                    lang === "ar" ? "النص الأصلي للفقاعة الثانية المتصلة..." : "Original text..."
                  }
                  rows={2}
                  className="text-xs dir-ltr bg-background rounded-lg resize-y focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  {t.splitTranslatedPart2}
                </Label>
                <Textarea
                  value={part2Translated}
                  onChange={(e) => setPart2Translated(e.target.value)}
                  placeholder={
                    lang === "ar" ? "ترجمة الفقاعة الثانية المتصلة..." : "Translated text..."
                  }
                  rows={2}
                  className="text-xs font-medium bg-background rounded-lg resize-y focus-visible:ring-1 focus-visible:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 rounded-xl"
          >
            {t.close}
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!part1Translated.trim() && !part2Translated.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-sm cursor-pointer"
          >
            <Split className="w-4 h-4" />
            {t.confirmSplitBtn}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
