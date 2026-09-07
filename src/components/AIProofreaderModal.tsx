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
  Sparkles,
  Crown,
  Check,
  RefreshCw,
  ArrowRight,
  BookOpen,
  Wand2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { BubbleData, ImageData } from "@/types";
import { proofreadTranslationsWithAI, PolishedBubbleResult } from "@/lib/aiProofreader";
import { useI18n } from "@/lib/language";
import { toast } from "sonner";

interface AIProofreaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVip: boolean;
  apiKey: string;
  model: string;
  activeImage: ImageData | null;
  images: ImageData[];
  resultsMap: Record<string, BubbleData[]>;
  onApplyPolishedBubbles: (updatedMap: Record<string, BubbleData[]>) => void;
}

export const AIProofreaderModal: React.FC<AIProofreaderModalProps> = ({
  open,
  onOpenChange,
  isVip,
  apiKey,
  model,
  activeImage,
  images,
  resultsMap,
  onApplyPolishedBubbles,
}) => {
  const { lang } = useI18n();
  const [scope, setScope] = useState<"current" | "all">("current");
  const [styleContext, setStyleContext] = useState<string>("أدبي فصيح ودرامي مشوق");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ [imageId: string]: PolishedBubbleResult[] }>({});
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const currentBubbles = activeImage ? resultsMap[activeImage.id] || [] : [];
  const allBubblesCount = Object.values(resultsMap).reduce((acc, list) => acc + list.length, 0);

  const handleStartProofread = async () => {
    if (!isVip) {
      toast.error(
        lang === "ar"
          ? "ميزة التدقيق اللغوي والأدبي بالذكاء الاصطناعي حصرية لأعضاء VIP 👑"
          : "AI Proofreading is an exclusive VIP perk 👑",
      );
      return;
    }
    if (!apiKey) {
      toast.error(
        lang === "ar"
          ? "يرجى إدخال مفتاح Gemini API أولاً"
          : "Please enter your Gemini API key first",
      );
      return;
    }

    setIsLoading(true);
    setResults({});
    const newResults: { [imageId: string]: PolishedBubbleResult[] } = {};
    const newAccepted = new Set<string>();

    try {
      const targetImages = scope === "current" ? (activeImage ? [activeImage] : []) : images;

      if (targetImages.length === 0) {
        toast.error(lang === "ar" ? "لا توجد صفحات محددة" : "No pages selected");
        setIsLoading(false);
        return;
      }

      let processedCount = 0;
      for (const img of targetImages) {
        const bubbles = resultsMap[img.id] || [];
        if (bubbles.length === 0) continue;

        const { results: polished, error } = await proofreadTranslationsWithAI({
          bubbles,
          apiKey,
          model,
          genreContext: styleContext,
        });

        if (error) {
          toast.error(`❌ ${img.name}: ${error}`);
          continue;
        }

        if (polished.length > 0) {
          newResults[img.id] = polished;
          polished.forEach((p) => newAccepted.add(p.id));
          processedCount += polished.length;
        }
      }

      setResults(newResults);
      setAcceptedIds(newAccepted);

      if (processedCount > 0) {
        toast.success(
          lang === "ar"
            ? `تم التدقيق والتحسين الأدبي لـ ${processedCount} فقاعة بنجاح! ✨`
            : `Successfully polished ${processedCount} bubbles! ✨`,
        );
      } else {
        toast.info(lang === "ar" ? "لم يتم العثور على فقاعات مترجمة للتدقيق" : "No bubbles found");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to proofread");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAccept = (id: string) => {
    setAcceptedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplyAll = () => {
    const updatedMap = { ...resultsMap };
    let totalUpdated = 0;

    for (const [imageId, polishedList] of Object.entries(results)) {
      const existingBubbles = updatedMap[imageId] || [];
      const updatedList = existingBubbles.map((orig) => {
        const match = polishedList.find((p) => p.id === orig.id);
        if (match && acceptedIds.has(match.id)) {
          totalUpdated++;
          return {
            ...orig,
            translatedText: match.polishedText,
          };
        }
        return orig;
      });
      updatedMap[imageId] = updatedList;
    }

    onApplyPolishedBubbles(updatedMap);
    toast.success(
      lang === "ar"
        ? `تم تطبيق ${totalUpdated} تحسين أدبي على المانهوا بنجاح! 🪄`
        : `Applied ${totalUpdated} polished translations! 🪄`,
    );
    onOpenChange(false);
  };

  const totalPolishedCount = Object.values(results).reduce((acc, l) => acc + l.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>
                    {lang === "ar"
                      ? "التدقيق والتحسين الأدبي بالذكاء الاصطناعي"
                      : "AI Proofreader & Polisher"}
                  </span>
                  <span className="text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Crown className="w-3 h-3 fill-current" /> VIP
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "تحسين الصياغة الأدبية والبلاغة، إزالة الركاكة، وضبط علامات الترقيم مع الحفاظ على الوسوم"
                    : "Polish Arabic literary style, eloquence, and fix awkward phrases"}
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
                  ? "التدقيق اللغوي والأدبي بالذكاء الاصطناعي يمنح مانهواك أسلوباً عربياً فصيحاً وممتعاً للقراءة مثل المانجا المطبوعة تماماً. تواصل مع المسؤول أو فعّل حسابك للاستفادة منها."
                  : "AI Proofreading refines translation style into professional literary Arabic. Sign in or contact admin to activate VIP."}
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
              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    {lang === "ar" ? "نطاق التدقيق" : "Scope"}
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={scope === "current" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScope("current")}
                      className="flex-1 text-xs rounded-lg"
                    >
                      {lang === "ar"
                        ? `الصفحة الحالية (${currentBubbles.length})`
                        : `Current Page (${currentBubbles.length})`}
                    </Button>
                    <Button
                      type="button"
                      variant={scope === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setScope("all")}
                      className="flex-1 text-xs rounded-lg"
                    >
                      {lang === "ar"
                        ? `كل الفصل (${allBubblesCount})`
                        : `Full Chapter (${allBubblesCount})`}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    {lang === "ar" ? "أسلوب الصياغة الأدبية" : "Literary Style"}
                  </label>
                  <select
                    value={styleContext}
                    onChange={(e) => setStyleContext(e.target.value)}
                    className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2 font-medium"
                  >
                    <option value="أدبي فصيح ودرامي مشوق">
                      أدبي فصيح ودرامي مشوق (قياسي للمانهوا)
                    </option>
                    <option value="تاريخي / إمبراطوري راقي">
                      تاريخي / إمبراطوري راقي (قصور ونبلاء)
                    </option>
                    <option value="أكشن وحماسي سريع">أكشن وحماسي سريع (قتالات وشونين)</option>
                    <option value="عفوي ومعاصر دافئ">
                      عفوي ومعاصر دافئ (شريحة من الحياة/رومانسي)
                    </option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              {totalPolishedCount === 0 && (
                <Button
                  onClick={handleStartProofread}
                  disabled={isLoading}
                  className="w-full h-10 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2 shadow-md"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {lang === "ar"
                          ? "جاري التدقيق والتحسين بالذكاء الاصطناعي..."
                          : "Proofreading with AI..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>
                        {lang === "ar"
                          ? "بدء التدقيق والتحسين الأدبي الآن ✨"
                          : "Start AI Proofreading Now ✨"}
                      </span>
                    </>
                  )}
                </Button>
              )}

              {/* Results Review */}
              {totalPolishedCount > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      {lang === "ar"
                        ? `النتائج المنقحة (${acceptedIds.size} من ${totalPolishedCount} محددة)`
                        : `Polished Results (${acceptedIds.size} / ${totalPolishedCount})`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartProofread}
                      disabled={isLoading}
                      className="h-7 text-xs text-orange-500 hover:text-orange-600 gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                      <span>{lang === "ar" ? "إعادة التدقيق" : "Re-run"}</span>
                    </Button>
                  </div>

                  <ScrollArea className="h-64 rounded-xl border border-border p-2 bg-muted/20">
                    <div className="space-y-2.5">
                      {Object.entries(results).map(([imgId, list]) => {
                        const img = images.find((x) => x.id === imgId);
                        return (
                          <div key={imgId} className="space-y-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase px-1">
                              {img?.name || imgId}
                            </span>
                            {list.map((item) => {
                              const isChecked = acceptedIds.has(item.id);
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleAccept(item.id)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer text-xs space-y-1.5 ${
                                    isChecked
                                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-2xs"
                                      : "border-border/60 bg-card opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleAccept(item.id)}
                                        className="rounded text-emerald-500 focus:ring-emerald-500"
                                      />
                                      <span className="text-[10px] font-bold text-foreground">
                                        فقاعة #{item.id.slice(-4)}
                                      </span>
                                    </div>
                                    {item.notes && (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                                        {item.notes}
                                      </span>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                                    <div className="p-1.5 bg-muted/40 rounded-lg text-muted-foreground text-[11px] line-through">
                                      {item.oldText}
                                    </div>
                                    <div className="p-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium rounded-lg text-[11px]">
                                      {item.polishedText}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
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
          {isVip && totalPolishedCount > 0 && (
            <Button
              size="sm"
              onClick={handleApplyAll}
              disabled={acceptedIds.size === 0}
              className="text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {lang === "ar"
                  ? `اعتماد المحدد (${acceptedIds.size})`
                  : `Apply (${acceptedIds.size})`}
              </span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
