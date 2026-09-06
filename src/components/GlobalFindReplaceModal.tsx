import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Replace,
  Search,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/language";
import { ExtractedText } from "@/types/manga";
import {
  findMatches,
  executeReplace,
  FindReplaceOptions,
  FindMatch,
  buildSearchRegex,
} from "@/lib/findReplaceUtils";
import { toast } from "sonner";

interface GlobalFindReplaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: { id: string; name: string }[];
  resultsMap: Record<string, ExtractedText[]>;
  activeImageIndex: number;
  onSelectImageIndex: (index: number) => void;
  onUpdateResultsMap: (newMap: Record<string, ExtractedText[]>) => void;
  onHighlightBubble?: (bubbleId: string) => void;
}

export const GlobalFindReplaceModal: React.FC<GlobalFindReplaceModalProps> = ({
  open,
  onOpenChange,
  images,
  resultsMap,
  activeImageIndex,
  onSelectImageIndex,
  onUpdateResultsMap,
  onHighlightBubble,
}) => {
  const { t, lang } = useI18n();

  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [scope, setScope] = useState<"all" | "current">("all");
  const [targetField, setTargetField] = useState<"translated" | "original">("translated");
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);

  const activeImage = images[activeImageIndex] || null;

  const options: FindReplaceOptions = useMemo(
    () => ({
      findText,
      replaceText,
      matchCase,
      matchWholeWord,
      targetField,
    }),
    [findText, replaceText, matchCase, matchWholeWord, targetField],
  );

  const matches: FindMatch[] = useMemo(() => {
    return findMatches(images, resultsMap, options, scope, activeImage?.id);
  }, [images, resultsMap, options, scope, activeImage]);

  // Unique pages with matches
  const affectedPagesCount = useMemo(() => {
    const pageSet = new Set(matches.map((m) => m.imageId));
    return pageSet.size;
  }, [matches]);

  const handleReplaceAll = () => {
    if (!findText.trim()) return;

    const { updatedMap, totalReplacements, affectedPages } = executeReplace(
      resultsMap,
      options,
      scope,
      activeImage?.id,
    );

    if (totalReplacements > 0) {
      onUpdateResultsMap(updatedMap);
      toast.success(t.replaceSuccessMsg(totalReplacements, affectedPages));
    } else {
      toast.info(t.noMatchesFoundFor(findText));
    }
  };

  const handleReplaceSingle = (match: FindMatch) => {
    const { updatedMap, totalReplacements } = executeReplace(
      resultsMap,
      options,
      "all",
      null,
      match.bubbleId,
    );

    if (totalReplacements > 0) {
      onUpdateResultsMap(updatedMap);
      toast.success(lang === "ar" ? "تم استبدال هذا الموضع!" : "Replaced instance!");
    }
  };

  const handleJumpToPage = (match: FindMatch) => {
    const targetIdx = images.findIndex((img) => img.id === match.imageId);
    if (targetIdx !== -1) {
      onSelectImageIndex(targetIdx);
      if (onHighlightBubble) {
        onHighlightBubble(match.bubbleId);
      }
      onOpenChange(false);
    }
  };

  const renderHighlightedSnippet = (text: string) => {
    const regex = buildSearchRegex(options);
    if (!regex || !text) return text;

    const parts = text.split(regex);
    const matchedTokens = text.match(regex) || [];

    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {part}
        {matchedTokens[i] && (
          <mark className="bg-orange-500/25 text-orange-600 dark:text-orange-400 font-bold px-1 rounded mx-0.5 border border-orange-500/30">
            {matchedTokens[i]}
          </mark>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="global-find-replace-dialog"
        className="max-w-2xl rounded-2xl max-h-[90vh] flex flex-col p-5 sm:p-6"
      >
        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Replace className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">{t.globalFindReplace}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {t.globalFindReplaceDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/25 p-3.5 rounded-xl border border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.findWhat}
                </span>
                {findText && (
                  <button
                    type="button"
                    onClick={() => setFindText("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Label>
              <Input
                id="find-input-field"
                placeholder={t.findPlaceholder}
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                className="h-9 text-xs bg-background rounded-lg focus-visible:ring-orange-500"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Replace className="w-3.5 h-3.5 text-muted-foreground" />
                  {t.replaceWith}
                </span>
                {replaceText && (
                  <button
                    type="button"
                    onClick={() => setReplaceText("")}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Label>
              <Input
                id="replace-input-field"
                placeholder={t.replacePlaceholder}
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                className="h-9 text-xs bg-background rounded-lg focus-visible:ring-orange-500"
              />
            </div>
          </div>

          {/* Options and Scope Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-card p-3 rounded-xl border border-border/50">
            {/* Scope */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground mr-1">{t.page}:</span>
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  scope === "all"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.scopeAllPages} ({images.length})
              </button>
              <button
                type="button"
                onClick={() => setScope("current")}
                disabled={!activeImage}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  scope === "current"
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted disabled:opacity-40"
                }`}
              >
                {t.scopeCurrentPageOnly}
              </button>
            </div>

            {/* Target Field */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-muted-foreground mr-1">
                {t.targetFieldLabel}:
              </span>
              <button
                type="button"
                onClick={() => setTargetField("translated")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  targetField === "translated"
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.targetTranslated}
              </button>
              <button
                type="button"
                onClick={() => setTargetField("original")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  targetField === "original"
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.targetOriginal}
              </button>
            </div>

            {/* Modifiers */}
            <div className="flex items-center gap-3 w-full pt-1 border-t border-border/40">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-border accent-orange-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{t.matchCase}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={matchWholeWord}
                  onChange={(e) => setMatchWholeWord(e.target.checked)}
                  className="rounded border-border accent-orange-600 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{t.matchWholeWord}</span>
              </label>
            </div>
          </div>

          {/* Results Summary Banner */}
          <div>
            {findText.trim() ? (
              matches.length > 0 ? (
                <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/25 p-2.5 rounded-xl">
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    {t.matchesFoundCount(matches.length, affectedPagesCount)}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold border-orange-500/30">
                    {matches.length} {lang === "ar" ? "مطابقة" : "matches"}
                  </Badge>
                </div>
              ) : (
                <div className="bg-muted/30 border border-border/60 p-3 rounded-xl text-center text-xs text-muted-foreground">
                  {t.noMatchesFoundFor(findText)}
                </div>
              )
            ) : (
              <div className="bg-muted/20 border border-dashed border-border p-4 rounded-xl text-center text-xs text-muted-foreground">
                {lang === "ar"
                  ? "اكتب كلمة أو اسماً أو مصطلحاً في مربع البحث لعرض كافة التطابقات والاستبدال الفوري..."
                  : "Type a word or name to search and replace across all pages..."}
              </div>
            )}
          </div>

          {/* Matches List */}
          {matches.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {matches.map((match, idx) => (
                <div
                  key={`${match.imageId}-${match.bubbleId}-${idx}`}
                  className="p-3 bg-card rounded-xl border border-border/60 hover:border-orange-500/40 transition-colors space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-orange-600/90 text-white text-[10px] px-2 py-0.5">
                        {t.page} {match.pageIndex + 1}
                      </Badge>
                      <span className="text-muted-foreground text-[11px] truncate max-w-36 font-mono">
                        {match.imageName}
                      </span>
                      <span className="text-[10px] font-bold text-orange-500">
                        #{match.bubbleIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleJumpToPage(match)}
                        className="h-6 px-2 text-[10px] font-semibold gap-1 text-muted-foreground hover:text-orange-500"
                        title={t.jumpToBubblePage}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.jumpToBubblePage}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReplaceSingle(match)}
                        className="h-6 px-2 text-[10px] font-bold gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                      >
                        <Replace className="w-3 h-3" />
                        {t.replaceSingleOccurrence}
                      </Button>
                    </div>
                  </div>

                  <div className="text-foreground leading-relaxed p-2 bg-muted/30 rounded-lg text-xs font-medium">
                    {renderHighlightedSnippet(match.snippet)}
                  </div>
                </div>
              ))}
            </div>
          )}
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
            disabled={!findText.trim() || matches.length === 0}
            onClick={handleReplaceAll}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Replace className="w-4 h-4" />
            {t.replaceAllMatchesBtn(matches.length)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
