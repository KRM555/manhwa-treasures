import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Sparkles,
  Zap,
  FileText,
  Users,
  Layers,
  ShieldCheck,
  CheckCircle2,
  BrainCircuit,
} from "lucide-react";
import { useI18n } from "@/lib/language";

interface VipPerksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVip: boolean;
  currentUserEmail: string | null;
}

export const VipPerksModal: React.FC<VipPerksModalProps> = ({
  open,
  onOpenChange,
  isVip,
  currentUserEmail,
}) => {
  const { lang } = useI18n();

  const perks = [
    {
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      title:
        lang === "ar" ? "التدقيق والتحسين الأدبي بالذكاء الاصطناعي" : "AI Proofreader & Polisher",
      desc:
        lang === "ar"
          ? "مراجعة ثانية فورية لصياغة الحوارات بالعربية الفصحى، تحسين البلاغة، وإزالة الركاكة مع الحفاظ على الوسوم."
          : "Refines dialogue into fluent literary Arabic, fixes awkward phrasing, and preserves tags.",
      badge: "حصري VIP",
    },
    {
      icon: Zap,
      color: "from-amber-400 to-yellow-500",
      title:
        lang === "ar"
          ? "وضع التوربو والمعالجة المتوازية (Turbo Parallel)"
          : "Unlimited Turbo Batch",
      desc:
        lang === "ar"
          ? "رفع فصول كاملة (بدون حد 10 صفحات) مع معالجة متوازية لـ 3 صفحات معاً بسرعة مضاعفة 3x."
          : "Upload unlimited pages per chapter with 3x parallel multi-page processing.",
      badge: "سرعة 3x",
    },
    {
      icon: BrainCircuit,
      color: "from-purple-500 to-pink-500",
      title:
        lang === "ar"
          ? "نماذج Pro الفائقة والتفكير العميق (Extended Thinking)"
          : "Gemini Pro & Deep Thinking",
      desc:
        lang === "ar"
          ? "وصول حصري لنماذج Gemini 3.1 Pro و 2.5 Pro مع استدلال عميق لفهم سياق الأحداث والمؤثرات المعقدة."
          : "Exclusive access to Pro reasoning models and high-level thinking config.",
      badge: "دقة قصوى",
    },
    {
      icon: FileText,
      color: "from-blue-500 to-indigo-500",
      title:
        lang === "ar"
          ? "تصدير إلى Google Docs ورابط سحابي"
          : "Google Docs Live Export & Cloud Link",
      desc:
        lang === "ar"
          ? "إنشاء مسودة منسقة ببريدك مع فتح فوري في Google Docs وتوليد روابط سحابية مباشرة للفريق."
          : "Export formatted docs with your email, instant 1-click Google Docs opening, and share links.",
      badge: "جاهز للنشر",
    },
    {
      icon: Users,
      color: "from-emerald-500 to-teal-500",
      title:
        lang === "ar" ? "مشاركة القاموس السحابي للفرق (Team Glossary)" : "Team Shared Glossary",
      desc:
        lang === "ar"
          ? "توليد رابط أو رمز مشاركة موحد لقاموس أسماء ومصطلحات المانهوا ليعمل الفريق بنفس المصطلحات."
          : "Generate shareable links so your translation and editing team use identical terminology.",
      badge: "تعاون جماعي",
    },
    {
      icon: Layers,
      color: "from-rose-500 to-red-500",
      title: lang === "ar" ? "مساحات عمل وفصول سحابية غير محدودة" : "Unlimited Cloud Workspaces",
      desc:
        lang === "ar"
          ? "فتح وتنسيق عدد غير محدود من الفصول ومساحات العمل المتزامنة سحابياً عبر كل أجهزتك."
          : "Open and switch between unlimited simultaneous chapter tabs synced to the cloud.",
      badge: "غير محدود",
    },
    {
      icon: ShieldCheck,
      color: "from-emerald-600 to-green-600",
      title: lang === "ar" ? "إعفاء كامل بنسبة 100% من الإعلانات" : "100% Ad-Free Experience",
      desc:
        lang === "ar"
          ? "حظر وإخفاء كامل لجميع بنرات ومساحات الإعلانات لشاشة نظيفة ومساحة عمل مريحة للعين."
          : "Complete removal and blocking of all advertising banners for an ultra-clean workspace.",
      badge: "بدون إعلانات",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-5 border-b border-border bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{lang === "ar" ? "باقة عضوية VIP الاحترافية" : "VIP Pro Membership"}</span>
                  {isVip ? (
                    <span className="text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === "ar" ? "مفعلة لحسابك 👑" : "Active 👑"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {lang === "ar" ? "مميزات حصرية" : "Exclusive Perks"}
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentUserEmail
                    ? `${lang === "ar" ? "الحساب الحالي:" : "Current account:"} ${currentUserEmail}`
                    : lang === "ar"
                      ? "مصممة خصيصاً لمترجمي ومبيضي فرق المانجا والمانهوا الاحترافية"
                      : "Designed specifically for professional scanlation teams"}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {perks.map((perk, i) => {
              const IconComp = perk.icon;
              return (
                <div
                  key={i}
                  className="p-3 bg-card hover:bg-muted/40 border border-border/80 rounded-xl transition-all flex items-start gap-3 shadow-2xs"
                >
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-br ${perk.color} text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{perk.title}</h4>
                      <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md shrink-0">
                        {perk.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {perk.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
          {!isVip && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                window.dispatchEvent(new CustomEvent("open_auth_modal"));
              }}
              className="text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1.5 shadow-md"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "تفعيل VIP / تسجيل الدخول" : "Activate VIP / Sign In"}</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
