import React, { useState } from "react";
import {
  Menu,
  FolderPlus,
  BookOpen,
  Database,
  Settings2,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BrainCircuit,
  X,
  Info,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/language";
import { PrivacyPolicyModal } from "./PrivacyPolicyModal";
import { useAdStatus } from "@/lib/adManager";

interface NavigationSidebarProps {
  onNewProject: () => void;
  onOpenGlossary: () => void;
  onOpenTM: () => void;
  onOpenTagSettings: () => void;
  onOpenHowToUse: () => void;
  glossaryCount: number;
  extendedThinking: boolean;
  onExtendedThinkingChange: (checked: boolean) => void;
  brandName: string;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  onNewProject,
  onOpenGlossary,
  onOpenTM,
  onOpenTagSettings,
  onOpenHowToUse,
  glossaryCount,
  extendedThinking,
  onExtendedThinkingChange,
  brandName,
}) => {
  const { t, lang } = useI18n();
  const { isAdFree, currentUserEmail } = useAdStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3 text-xs font-bold rounded-xl border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shadow-sm"
            title={lang === "ar" ? "القائمة والأدوات الجانبية" : "Navigation & Tools"}
          >
            <Menu className="w-4 h-4 text-orange-500" />
            <span className="hidden sm:inline">
              {lang === "ar" ? "الأدوات والمشاريع" : "Studio Menu"}
            </span>
          </Button>
        </SheetTrigger>

        <SheetContent
          side={lang === "ar" ? "right" : "left"}
          className="w-[320px] sm:w-[380px] p-0 flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-5 border-b border-border bg-card/60 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-10 h-10 rounded-xl object-cover border border-orange-200 dark:border-orange-900/50 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1.5">
                    {brandName}
                    {isAdFree && (
                      <span className="text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.2 rounded-full shadow-sm">
                        VIP
                      </span>
                    )}
                  </h3>
                  {isAdFree ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>
                        {lang === "ar" ? "عضوية VIP (بدون إعلانات)" : "VIP Ad-Free Active"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      <span>{lang === "ar" ? "لوحة التحكم السريعة" : "Quick Toolset"}</span>
                    </p>
                  )}
                </div>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <X className="w-4 h-4" />
                </Button>
              </SheetClose>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* قسم إدارة المشاريع */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                {lang === "ar" ? "إدارة المشاريع" : "Project Actions"}
              </span>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onNewProject();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-foreground hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 border border-border/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/15 text-orange-600 rounded-lg">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div className="text-start">
                    <div>{t.newProject}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {lang === "ar" ? "بدء فصل جديد وتفريغ القائمة" : "Start a clean chapter"}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* قسم أدوات الترجمة والتبييض الذكية */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                {lang === "ar" ? "أدوات التبييض والترجمة" : "Scanlation Tools"}
              </span>

              {/* القاموس */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenGlossary();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-foreground hover:bg-muted border border-border/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-lg">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-start">
                    <div className="flex items-center gap-1.5">
                      <span>{t.glossaryTitle}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {glossaryCount}
                      </Badge>
                    </div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {lang === "ar" ? "توحيد أسماء الشخصيات والتقنيات" : "Names & Terminology"}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>

              {/* ذاكرة الترجمة */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenTM();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-foreground hover:bg-muted border border-border/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg">
                    <Database className="w-4 h-4" />
                  </div>
                  <div className="text-start">
                    <div>{t.tmTitle}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {lang === "ar" ? "استدعاء الجمل المتكررة بذكاء" : "Re-use repeated sentences"}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>

              {/* إعدادات العلامات */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenTagSettings();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-foreground hover:bg-muted border border-border/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <Settings2 className="w-4 h-4" />
                  </div>
                  <div className="text-start">
                    <div>{t.tagSettings}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {lang === "ar"
                        ? "تخصيص وسوم المبيضين (SFX / حوار)"
                        : "Typer custom tags & prefixes"}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* إعدادات الذكاء الاصطناعي المتقدمة */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-foreground">Extended Thinking</span>
                </div>
                <Checkbox
                  id="drawer-extended-thinking"
                  checked={extendedThinking}
                  onCheckedChange={(c) => onExtendedThinkingChange(c === true)}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "تفعيل تفكير Gemini العميق لسياق الأحداث المعقدة وترجمة المصطلحات الصعبة بدقة أعلى."
                  : "Enables deep reasoning for nuanced context and tricky dialogue."}
              </p>
            </div>

            {/* قسم المساعدة والمعلومات */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                {lang === "ar" ? "المعلومات والأمان" : "Info & Security"}
              </span>

              {/* كيفية الاستخدام */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenHowToUse();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span>{t.howToUse}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>

              {/* سياسة الخصوصية */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowPrivacyModal(true);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{lang === "ar" ? "الخصوصية وأمان البيانات" : "Privacy & Security"}</span>
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-muted-foreground ${lang === "ar" ? "rotate-180" : ""}`}
                />
              </button>

              {/* رابط مجتمع ديسكورد */}
              <a
                href="https://discord.gg/2cM9392e62"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center text-[#5865F2]">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                    </svg>
                  </span>
                  <span>{lang === "ar" ? "مجتمع Discord" : "Discord Community"}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/20 text-center text-[10px] text-muted-foreground">
            {brandName} • v2.0 OCR & Cleaner
          </div>
        </SheetContent>
      </Sheet>

      <PrivacyPolicyModal open={showPrivacyModal} onOpenChange={setShowPrivacyModal} />
    </>
  );
};
