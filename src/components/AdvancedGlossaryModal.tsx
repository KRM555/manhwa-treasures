import React, { useState, useRef } from "react";
import { GlossaryItem, TermCategory, TermScope } from "@/types";
import {
  GLOSSARY_CATEGORIES,
  exportGlossaryToCSV,
  parseGlossaryFromCSV,
} from "@/lib/glossaryUtils";
import { useI18n } from "@/lib/language";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Lock,
  Globe,
  FileSpreadsheet,
  Users,
  Crown,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useAdStatus } from "@/lib/adManager";

interface AdvancedGlossaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  glossary: GlossaryItem[];
  onUpdateGlossary: (items: GlossaryItem[]) => void;
}

export const AdvancedGlossaryModal: React.FC<AdvancedGlossaryModalProps> = ({
  open,
  onOpenChange,
  glossary,
  onUpdateGlossary,
}) => {
  const { lang } = useI18n();
  const { isVip } = useAdStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sharing, setSharing] = useState(false);

  // Form State
  const [origTerm, setOrigTerm] = useState("");
  const [transTerm, setTransTerm] = useState("");
  const [category, setCategory] = useState<TermCategory>("character");
  const [dontTranslate, setDontTranslate] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [scope, setScope] = useState<TermScope>("global");
  const [targetLang, setTargetLang] = useState<"all" | "ar" | "en">("all");

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const handleAddTerm = () => {
    if (!origTerm.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة المصطلح الأصلي" : "Original term is required");
      return;
    }
    if (!transTerm.trim() && !dontTranslate) {
      toast.error(
        lang === "ar"
          ? "يرجى كتابة الترجمة المعتمدة أو تفعيل خيار قفل المصطلح"
          : "Translation is required unless term is locked",
      );
      return;
    }

    const newItem: GlossaryItem = {
      id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      original: origTerm.trim(),
      translation: dontTranslate ? origTerm.trim() : transTerm.trim(),
      category,
      dontTranslate,
      caseSensitive,
      scope,
      targetLang,
    };

    onUpdateGlossary([...glossary, newItem]);
    setOrigTerm("");
    setTransTerm("");
    toast.success(lang === "ar" ? "تمت إضافة المصطلح للقاموس" : "Term added to glossary");
  };

  const handleDelete = (id: string) => {
    onUpdateGlossary(glossary.filter((item) => item.id !== id));
  };

  const handleExportCSV = () => {
    if (glossary.length === 0) {
      toast.error(lang === "ar" ? "القاموس فارغ حالياً" : "Glossary is empty");
      return;
    }
    const csvContent = exportGlossaryToCSV(glossary);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `manga_glossary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ar" ? "تم تصدير القاموس بصيغة CSV بنجاح" : "Glossary exported to CSV");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = parseGlossaryFromCSV(text);
        if (imported.length === 0) {
          toast.error(
            lang === "ar" ? "تعذر قراءة ملف CSV أو أنه فارغ" : "Could not parse CSV file",
          );
          return;
        }

        // Merge without duplicates on original term
        const existingOrigs = new Set(glossary.map((g) => g.original.toLowerCase()));
        const toAdd: GlossaryItem[] = [];

        for (const item of imported) {
          if (item.original && !existingOrigs.has(item.original.toLowerCase())) {
            toAdd.push({
              id: item.id || `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              original: item.original,
              translation: item.translation || item.original,
              category: item.category || "general",
              dontTranslate: Boolean(item.dontTranslate),
              caseSensitive: Boolean(item.caseSensitive),
              scope: item.scope || "global",
              targetLang: item.targetLang || "all",
            });
            existingOrigs.add(item.original.toLowerCase());
          }
        }

        onUpdateGlossary([...glossary, ...toAdd]);
        toast.success(
          lang === "ar"
            ? `تم استيراد ${toAdd.length} مصطلح بنجاح!`
            : `Imported ${toAdd.length} terms successfully!`,
        );
      } catch (err: any) {
        toast.error(lang === "ar" ? "فشل استيراد الملف" : "Failed to import file");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleShareTeamGlossary = async () => {
    if (!isVip) {
      toast.error(
        lang === "ar"
          ? "مشاركة القاموس السحابي للفرق ميزة حصرية لأعضاء VIP 👑"
          : "Team Shared Glossary is an exclusive VIP perk 👑",
      );
      return;
    }
    if (glossary.length === 0) {
      toast.error(lang === "ar" ? "القاموس فارغ حالياً" : "Glossary is empty");
      return;
    }

    setSharing(true);
    try {
      // Save/Encode glossary in URL parameter or local storage
      const encoded = encodeURIComponent(JSON.stringify(glossary));
      const shareUrl = `${window.location.origin}?team_glossary=${encoded}`;

      await navigator.clipboard.writeText(shareUrl);
      toast.success(
        lang === "ar"
          ? `تم نسخ رابط مشاركة قاموس الفريق (${glossary.length} مصطلح)! أرسله لأعضاء الفريق لاستيراده فوراً 👥`
          : `Copied team glossary link (${glossary.length} terms)! 👥`,
      );
    } catch {
      toast.error(lang === "ar" ? "فشل نسخ الرابط" : "Failed to copy link");
    } finally {
      setSharing(false);
    }
  };

  // Filtered glossary items
  const filteredItems = glossary.filter((item) => {
    const matchesSearch =
      item.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === "all" || item.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <span>
                {lang === "ar" ? "قاموس المصطلحات والأسماء المتقدم" : "Advanced Glossary Manager"}
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "استيراد CSV" : "Import CSV"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareTeamGlossary}
                disabled={sharing}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs"
                title={
                  lang === "ar"
                    ? "مشاركة هذا القاموس مع فريق المترجمين والمبيضين (VIP)"
                    : "Share this glossary with your team (VIP)"
                }
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === "ar" ? "مشاركة الفريق (VIP)" : "Team Share (VIP)"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "تصدير CSV" : "Export CSV"}</span>
              </Button>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "يتم إرسال هذا القاموس بصيغة JSON محكمة إلى Gemini لضمان ثبات أسماء الأبطال والتقنيات والمواقع 100%."
              : "This glossary is injected as strict structured JSON into Gemini to guarantee 100% terminology consistency."}
          </DialogDescription>
        </DialogHeader>

        {/* Term Creation Form */}
        <div className="p-4 bg-muted/30 border border-border/80 rounded-xl space-y-3 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {lang === "ar" ? "الاسم / المصطلح الأصلي (كوري، ياباني، صيني...)" : "Original Term"}
              </Label>
              <Input
                placeholder={lang === "ar" ? "مثال: 차해인 أو Sung Jin-Woo" : "e.g. Sung Jin-Woo"}
                value={origTerm}
                onChange={(e) => setOrigTerm(e.target.value)}
                className="h-8 text-xs bg-background rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {lang === "ar" ? "الترجمة المعتمدة" : "Approved Translation"}
              </Label>
              <Input
                placeholder={lang === "ar" ? "مثال: تشا هاي إن" : "e.g. Cha Hae-In"}
                value={transTerm}
                onChange={(e) => setTransTerm(e.target.value)}
                disabled={dontTranslate}
                className="h-8 text-xs bg-background rounded-lg disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {lang === "ar" ? "نوع المصطلح" : "Term Category"}
              </Label>
              <Select value={category} onValueChange={(val) => setCategory(val as TermCategory)}>
                <SelectTrigger className="h-8 text-xs rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {GLOSSARY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {lang === "ar" ? cat.labelAr : cat.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {lang === "ar" ? "نطاق التطبيق" : "Scope"}
              </Label>
              <Select value={scope} onValueChange={(val) => setScope(val as TermScope)}>
                <SelectTrigger className="h-8 text-xs rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="global" className="text-xs">
                    {lang === "ar" ? "عام لكل الفصول (Global)" : "All Chapters (Global)"}
                  </SelectItem>
                  <SelectItem value="chapter" className="text-xs">
                    {lang === "ar" ? "هذا الفصل فقط (Chapter-Only)" : "Current Chapter Only"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {lang === "ar" ? "اللغة المستهدفة" : "Target Language"}
              </Label>
              <Select value={targetLang} onValueChange={(val) => setTargetLang(val as any)}>
                <SelectTrigger className="h-8 text-xs rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    {lang === "ar" ? "جميع اللغات (All)" : "All Languages"}
                  </SelectItem>
                  <SelectItem value="ar" className="text-xs">
                    {lang === "ar" ? "العربية فقط" : "Arabic Only"}
                  </SelectItem>
                  <SelectItem value="en" className="text-xs">
                    {lang === "ar" ? "الإنجليزية فقط" : "English Only"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontTranslate}
                  onChange={(e) => setDontTranslate(e.target.checked)}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-orange-500" />
                  {lang === "ar" ? "منع الترجمة (تثبيت اللفظ)" : "Do Not Translate (Lock Term)"}
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="rounded border-border text-orange-600 focus:ring-orange-500"
                />
                <span>{lang === "ar" ? "حساس لحالة الأحرف (Aa)" : "Case Sensitive"}</span>
              </label>
            </div>

            <Button
              onClick={handleAddTerm}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-4 rounded-xl gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "إضافة المصطلح" : "Add Term"}</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Header */}
        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder={lang === "ar" ? "بحث في القاموس..." : "Search terms..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pr-8 rounded-xl bg-background"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">
                  {lang === "ar" ? "جميع التصنيفات" : "All Categories"}
                </SelectItem>
                {GLOSSARY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    {lang === "ar" ? cat.labelAr : cat.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {lang === "ar"
              ? `${filteredItems.length} مصطلح محفوظ`
              : `${filteredItems.length} saved terms`}
          </span>
        </div>

        {/* Terms List */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 max-h-[350px]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
              <p>{lang === "ar" ? "لا توجد مصطلحات مطابقة" : "No glossary items found"}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const catMeta = GLOSSARY_CATEGORIES.find((c) => c.value === item.category);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-card border border-border/80 rounded-xl hover:border-orange-500/40 transition-all text-xs"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 rounded-lg border ${catMeta?.badgeClass || ""}`}
                    >
                      {lang === "ar"
                        ? catMeta?.labelAr || item.category
                        : catMeta?.labelEn || item.category}
                    </Badge>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-bold text-foreground truncate">{item.original}</span>
                      <span className="text-muted-foreground text-xs">➔</span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400 truncate">
                        {item.dontTranslate ? (
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <Lock className="w-3 h-3" /> {lang === "ar" ? "[مقفول]" : "[Locked]"}
                          </span>
                        ) : (
                          item.translation
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.scope === "chapter" && (
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                        {lang === "ar" ? "فصل" : "Chapter"}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
