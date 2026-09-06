import React, { useState, useEffect } from "react";
import { TranslationMemoryEntry } from "@/types";
import {
  getTranslationMemory,
  clearTranslationMemory,
  deleteTranslationMemoryEntry,
} from "@/lib/translationMemory";
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
import { Badge } from "@/components/ui/badge";
import { Database, Trash2, Search, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TranslationMemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TranslationMemoryModal: React.FC<TranslationMemoryModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { lang } = useI18n();
  const [entries, setEntries] = useState<TranslationMemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const refreshEntries = () => {
    setEntries(getTranslationMemory());
  };

  useEffect(() => {
    if (open) {
      refreshEntries();
    }
  }, [open]);

  const handleDeleteEntry = (id: string) => {
    deleteTranslationMemoryEntry(id);
    refreshEntries();
    toast.success(lang === "ar" ? "تم حذف العنصر من الذاكرة" : "Entry removed from memory");
  };

  const handleClearAll = () => {
    if (
      window.confirm(
        lang === "ar"
          ? "هل أنت متأكد من رغبتك في مسح كافة بيانات ذاكرة الترجمة؟"
          : "Are you sure you want to clear all translation memory data?",
      )
    ) {
      clearTranslationMemory();
      refreshEntries();
      toast.success(lang === "ar" ? "تم مسح ذاكرة الترجمة بالكامل" : "Translation memory cleared");
    }
  };

  const filtered = entries.filter((e) => {
    const q = searchQuery.toLowerCase();
    return e.originalText.toLowerCase().includes(q) || e.translatedText.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-500" />
              <span>
                {lang === "ar" ? "ذاكرة الترجمة (Translation Memory)" : "Translation Memory"}
              </span>
            </DialogTitle>
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="h-8 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl border-red-500/30 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "مسح الذاكرة" : "Clear All"}</span>
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "تحفظ العبارات والأسماء المترجمة تلقائياً لتسريع معالجة الصفحات اللاحقة وتوفير استهلاك الرموز (Tokens) بنسبة 100% للنصوص المتكررة."
              : "Automatically caches approved translations to accelerate future pages and save 100% of tokens for recurring texts."}
          </DialogDescription>
        </DialogHeader>

        {/* Stats banner */}
        <div className="flex items-center justify-between p-3 bg-muted/40 border border-border/80 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-foreground">
              {lang === "ar" ? "إجمالي النصوص المخزنة:" : "Total Cached Pairs:"}
            </span>
            <Badge
              variant="secondary"
              className="font-bold text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400"
            >
              {entries.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshEntries}
            className="h-7 text-xs gap-1 text-muted-foreground rounded-lg"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{lang === "ar" ? "تحديث" : "Refresh"}</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder={lang === "ar" ? "ابحث في الذاكرة..." : "Search cached translations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pr-8 rounded-xl bg-background"
          />
        </div>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
              <p>
                {lang === "ar"
                  ? "لا توجد نصوص مسجلة في الذاكرة بعد"
                  : "No entries in translation memory yet"}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-card border border-border/70 rounded-xl hover:border-orange-500/30 transition-all text-xs"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0.2 rounded-md font-mono text-muted-foreground"
                  >
                    x{item.frequency || 1}
                  </Badge>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-semibold text-foreground truncate dir-ltr text-left">
                      {item.originalText}
                    </span>
                    <span className="text-orange-600 dark:text-orange-400 font-medium truncate">
                      {item.translatedText}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEntry(item.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-red-500 rounded-lg shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
