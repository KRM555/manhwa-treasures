import React from "react";
import { Sparkles, Languages, BookOpen, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC = () => {
  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="Manhwa TransTool Studio Logo"
            className="w-14 h-14 rounded-2xl object-cover shadow-md shadow-orange-500/15 border-2 border-orange-200 dark:border-orange-900/50 bg-white p-0.5"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-gray-950 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Manhwa TransTool Studio
              </h1>
              <Badge
                variant="secondary"
                className="text-xs bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-semibold px-2 py-0.5 border border-orange-200 dark:border-orange-800"
              >
                v2.0 OCR
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
              Extracts text, removes speech balloons, and translates manga & manhwa
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
            <Languages className="w-4 h-4 text-primary" />
            <span>Multi-Language & SFX Ready</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
            <Wand2 className="w-4 h-4 text-orange-500" />
            <span>AI Inpainting</span>
          </div>
        </div>
      </div>
    </header>
  );
};
