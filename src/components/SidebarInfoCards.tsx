import React from 'react';
import { HelpCircle, ExternalLink, Key, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/language';

export const SidebarInfoCards: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    { num: 1, title: t.step1Title, desc: t.step1Desc, icon: Key },
    { num: 2, title: t.step2Title, desc: t.step2Desc, icon: Upload },
    { num: 3, title: t.step3Title, desc: t.step3Desc, icon: FileText },
    { num: 4, title: t.step4Title, desc: t.step4Desc, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4">
      <Card className="border border-orange-500/20 bg-card/80 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent">
          <CardTitle className="text-xs font-extrabold flex items-center gap-2 text-foreground">
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 inline-flex">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span>{t.guideTitle}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {steps.map((step) => {
            const StepIcon = step.icon;
            return (
              <div key={step.num} className="flex items-start gap-2.5 text-xs">
                <div className="w-5 h-5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  <StepIcon className="w-3 h-3" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground leading-tight flex items-center gap-1">
                    {step.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border border-[#5865F2]/30 bg-gradient-to-b from-[#5865F2]/5 to-card/60 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] text-white flex items-center justify-center shadow-md shadow-[#5865F2]/30 shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">{t.discordTitle}</h4>
              <p className="text-[11px] text-muted-foreground">{t.discordSub}</p>
            </div>
          </div>

          <a
            href="https://discord.gg/nuaqTHvx"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all hover:scale-[1.01]"
          >
            <span>{t.discordJoin}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
};
