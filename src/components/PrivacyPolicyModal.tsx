import React from "react";
import { ShieldCheck, Lock, EyeOff, ServerOff, FileCheck, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/language";

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ open, onOpenChange }) => {
  const { t, lang } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-orange-600">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span>
              {lang === "ar" ? "سياسة الخصوصية وأمان البيانات" : "Privacy Policy & Data Security"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs leading-relaxed text-muted-foreground">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3.5 space-y-1.5">
            <h4 className="font-bold text-orange-600 dark:text-orange-400 text-sm flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              {lang === "ar" ? "أمان مفتاح الـ API الخاص بك" : "Your API Key Security"}
            </h4>
            <p className="text-foreground text-[11px] leading-relaxed">
              {lang === "ar"
                ? "مفتاح Gemini API الخاص بك لا يتم إرساله إلى أي خادم خارجي أو حفظه في قاعدة بياناتنا. يتم حفظه مشفراً فقط في متصفحك (LocalStorage) ويُستخدم حصرياً لإرسال طلبات التحليل من جهازك إلى Google Gemini مباشرة."
                : "Your Gemini API key is never stored on our external servers or databases. It is saved strictly in your local browser storage (LocalStorage) and used only for your direct requests to Google Gemini."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border">
              <EyeOff className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-foreground mb-0.5">
                  {lang === "ar" ? "خصوصية الصور والصفحات" : "Image & Chapter Privacy"}
                </h5>
                <p>
                  {lang === "ar"
                    ? "الصور التي تقوم برفعها أو استيرادها من Google Drive تُعالج فورياً في ذاكرة جلسة العمل، ولا نقوم بتخزين نسخ دائمة من فصولك أو صورك على خوادمنا."
                    : "Uploaded or imported images are processed transiently in your active session. We do not store permanent copies of your manga chapters on our servers."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border">
              <ServerOff className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-foreground mb-0.5">
                  {lang === "ar" ? "حفظ القاموس والمشاريع محلياً" : "Local Workspace & Glossary"}
                </h5>
                <p>
                  {lang === "ar"
                    ? "نوافذ العمل (Workspaces) وقاموس المصطلحات وذاكرة الترجمة تُحفظ محلياً على جهازك؛ لا يمكن لأي مستخدم آخر الاطلاع على ترجماتك إلا إذا قمت بتصديرها بنفسك."
                    : "Workspaces, terminology glossaries, and translation memories reside locally in your browser storage. No other user can access your translations."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-card border border-border">
              <FileCheck className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-foreground mb-0.5">
                  {lang === "ar" ? "حقوق الملكية الفكرية" : "Intellectual Property"}
                </h5>
                <p>
                  {lang === "ar"
                    ? "الموقع أداة مساعدة تقنية للمترجمين والمبيضين. يتحمل المستخدم المسؤولية الكاملة عن المحتوى الذي يقوم بمعالجته وترجمته واستخدامه الشخصي أو مع فريقه."
                    : "This studio is a productivity tool for scanlators and translators. Users hold full responsibility for the content they process and translate."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {lang === "ar"
                ? "تطبيق معايير التصفح الآمن وحماية بيانات المستخدم 100%."
                : "100% Client-First Privacy & Safe Browsing Standards Compliant."}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-5 rounded-xl"
          >
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
