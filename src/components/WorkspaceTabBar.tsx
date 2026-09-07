import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  X,
  Layers,
  Sparkles,
  Pencil,
  Copy,
  Check,
  AlertCircle,
  FileImage,
  Crown,
} from "lucide-react";
import { WorkspaceTab } from "@/types/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/language";
import { useAdStatus } from "@/lib/adManager";
import { toast } from "sonner";

interface WorkspaceTabBarProps {
  workspaces: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCreateTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDuplicateTab?: (tabId: string) => void;
  isAnalyzing?: boolean;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  workspaces,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onCloseTab,
  onRenameTab,
  onDuplicateTab,
  isAnalyzing = false,
}) => {
  const { t, lang } = useI18n();
  const { isVip } = useAdStatus();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTabName, setTempTabName] = useState("");
  const [tabToClose, setTabToClose] = useState<WorkspaceTab | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const startRename = (tab: WorkspaceTab, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTabId(tab.id);
    setTempTabName(tab.name);
  };

  const handleSaveRename = () => {
    if (editingTabId && tempTabName.trim()) {
      onRenameTab(editingTabId, tempTabName.trim());
      toast.success(t.tabRenamedSuccess);
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  };

  const handleRequestClose = (tab: WorkspaceTab, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length <= 1) {
      toast.info(t.cannotCloseOnlyTab);
      return;
    }

    const hasData = tab.images.length > 0 || Object.keys(tab.resultsMap || {}).length > 0;

    if (hasData) {
      setTabToClose(tab);
    } else {
      onCloseTab(tab.id);
    }
  };

  const confirmClose = () => {
    if (tabToClose) {
      onCloseTab(tabToClose.id);
      setTabToClose(null);
      toast.info(t.tabClosedSuccess);
    }
  };

  return (
    <div className="w-full bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-1.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {/* Label and tabs list */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-muted-foreground shrink-0 select-none">
            <Layers className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">{t.workspaceTabs}:</span>
          </div>

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar min-w-0 flex-1"
          >
            {workspaces.map((tab, idx) => {
              const isActive = tab.id === activeTabId;
              const pageCount = tab.images?.length || 0;
              const hasTranslations = Object.keys(tab.resultsMap || {}).length > 0;
              const isCurrentEditing = editingTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  onClick={() => !isCurrentEditing && onSelectTab(tab.id)}
                  onDoubleClick={(e) => startRename(tab, e)}
                  title={
                    lang === "ar"
                      ? "انقر للتبديل، أو انقر مرتين لتعديل الاسم"
                      : "Click to switch, double click to rename"
                  }
                  className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer select-none transition-all text-xs shrink-0 border ${
                    isActive
                      ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400 font-bold shadow-xs"
                      : "bg-background/80 hover:bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground font-medium"
                  }`}
                >
                  {/* Status Indicator */}
                  {isActive && isAnalyzing ? (
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" />
                  ) : hasTranslations ? (
                    <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                  ) : pageCount > 0 ? (
                    <FileImage className="w-3 h-3 text-orange-400 shrink-0 opacity-80" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  )}

                  {/* Tab Title (or Inline Edit) */}
                  {isCurrentEditing ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        ref={editInputRef}
                        value={tempTabName}
                        onChange={(e) => setTempTabName(e.target.value)}
                        onBlur={handleSaveRename}
                        onKeyDown={handleKeyDown}
                        className="h-6 w-28 text-xs py-0 px-1.5 bg-background font-bold rounded"
                      />
                      <button
                        onClick={handleSaveRename}
                        className="text-emerald-500 hover:text-emerald-600"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="max-w-[130px] truncate">{tab.name}</span>
                  )}

                  {/* Pages count badge */}
                  {pageCount > 0 && !isCurrentEditing && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                        isActive ? "bg-orange-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.tabPagesCount(pageCount)}
                    </span>
                  )}

                  {/* Actions (Pencil & Close) */}
                  {!isCurrentEditing && (
                    <div className="flex items-center gap-0.5 ms-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(tab, e)}
                        title={t.renameTab}
                        className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      {workspaces.length > 1 && (
                        <button
                          onClick={(e) => handleRequestClose(tab, e)}
                          title={lang === "ar" ? "إغلاق النافذة" : "Close window"}
                          className="p-0.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Tab Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!isVip && workspaces.length >= 2) {
              toast.info(
                lang === "ar"
                  ? "تنبيه: الحساب المجاني يملك نافذتي عمل كحد أقصى. فعّل عضوية VIP لفتح عدد غير محدود من مساحات العمل والفصول ومزامنتها سحابياً 👑"
                  : "Free accounts can open up to 2 tabs. Activate VIP for unlimited cloud workspaces 👑",
                {
                  action: {
                    label: lang === "ar" ? "استعراض VIP" : "View VIP",
                    onClick: () => window.dispatchEvent(new CustomEvent("open_auth_modal")),
                  },
                },
              );
              return;
            }
            onCreateTab();
          }}
          title={t.newWorkspaceTab}
          className="h-8 text-xs font-bold gap-1 rounded-xl px-3 border-dashed border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shrink-0 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.newWorkspaceTab}</span>
          {!isVip && workspaces.length >= 2 && <Crown className="w-3 h-3 text-amber-500 ml-1" />}
        </Button>
      </div>

      {/* Confirmation Dialog on Closing Tab with content */}
      <Dialog open={Boolean(tabToClose)} onOpenChange={(open) => !open && setTabToClose(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span>{lang === "ar" ? "تأكيد إغلاق النافذة" : "Confirm Close"}</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.closeTabConfirm}</p>
          {tabToClose && (
            <div className="p-2.5 bg-muted/40 rounded-xl border border-border/60 text-xs flex justify-between items-center">
              <span className="font-bold text-foreground">{tabToClose.name}</span>
              <span className="text-muted-foreground text-[11px]">
                {t.tabPagesCount(tabToClose.images?.length || 0)}
              </span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTabToClose(null)}
              className="text-xs rounded-xl"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmClose}
              className="text-xs font-bold rounded-xl"
            >
              {lang === "ar" ? "نعم، أغلق النافذة" : "Yes, Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
