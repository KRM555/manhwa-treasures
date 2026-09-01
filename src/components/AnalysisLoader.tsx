import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Scan, Eraser, Languages, Type, CheckCircle2 } from 'lucide-react';

interface AnalysisLoaderProps {
  currentStep: number;
  progress: number;
}

const STEPS = [
  { icon: Scan, label: "Detecting Speech Bubbles & SFX" },
  { icon: Eraser, label: "Cleaning & Inpainting Original Text" },
  { icon: Languages, label: "Translating to Selected Target Language" },
  { icon: Type, label: "Typesetting & Rendering Manga Typography" },
];

export const AnalysisLoader: React.FC<AnalysisLoaderProps> = ({ currentStep, progress }) => {
  return (
    <Card className="border-orange-500/30 bg-orange-50/20 dark:bg-orange-950/10 rounded-2xl overflow-hidden shadow-md animate-in fade-in duration-300">
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-base text-foreground">AI Processing in Progress</h4>
              <p className="text-xs text-muted-foreground">Running manga-specialized OCR neural models...</p>
            </div>
          </div>
          <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-3 py-1 rounded-full">
            {progress}% Completed
          </span>
        </div>

        <Progress value={progress} className="h-2.5 rounded-full" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isDone = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div
                key={step.label}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isDone
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20 text-foreground'
                    : isCurrent
                    ? 'border-orange-500 bg-orange-100/50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 shadow-sm'
                    : 'border-border/50 bg-muted/20 text-muted-foreground opacity-60'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isCurrent ? 'animate-bounce text-orange-600' : ''}`} />
                  )}
                </div>
                <p className="text-xs font-semibold leading-tight">{step.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};