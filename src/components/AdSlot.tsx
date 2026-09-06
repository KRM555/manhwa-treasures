import React, { useEffect, useRef } from "react";
import { Megaphone, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/language";
import { useAdStatus } from "@/lib/adManager";

export interface AdSlotProps {
  id?: string;
  slotId?: string;
  adClient?: string;
  format?: "leaderboard" | "rectangle" | "banner" | "compact";
  className?: string;
  label?: string;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export const AdSlot: React.FC<AdSlotProps> = ({
  id,
  slotId,
  adClient,
  format = "leaderboard",
  className = "",
  label,
}) => {
  const { t } = useI18n();
  const { isAdFree } = useAdStatus();
  const adRef = useRef<HTMLModElement | null>(null);
  const isAdsenseConfigured = Boolean(adClient && slotId);

  useEffect(() => {
    if (!isAdFree && isAdsenseConfigured && typeof window !== "undefined") {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.debug("AdSense push error or adblock detected:", e);
      }
    }
  }, [isAdFree, isAdsenseConfigured]);

  // If user is ad-free (VIP / exempt / admin), render nothing at all!
  if (isAdFree) {
    return null;
  }

  // Refined, sleek dimensions to avoid bulky ugly boxes
  const formatClasses = {
    leaderboard: "w-full max-w-3xl min-h-[64px] sm:min-h-[72px] mx-auto",
    rectangle: "w-full max-w-[320px] min-h-[160px] sm:min-h-[180px] mx-auto",
    banner: "w-full min-h-[52px]",
    compact: "w-full min-h-[44px]",
  }[format];

  return (
    <div
      id={id}
      className={`ad-container relative flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/25 text-muted-foreground transition-all overflow-hidden ${formatClasses} ${className}`}
    >
      {/* Policy-compliant Ad Disclosure Tag */}
      <div className="absolute top-1.5 start-2 flex items-center gap-1 text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider select-none pointer-events-none">
        <Megaphone className="w-2.5 h-2.5 opacity-50" />
        <span>{label || t.adSponsored}</span>
      </div>

      {isAdsenseConfigured ? (
        <ins
          ref={adRef}
          className="adsbygoogle block w-full h-full"
          data-ad-client={adClient}
          data-ad-slot={slotId}
          data-ad-format={format === "rectangle" ? "rectangle" : "auto"}
          data-full-width-responsive="true"
        />
      ) : (
        /* Subtle, sleek placeholder */
        <div className="flex items-center justify-center gap-2 p-2.5 text-center select-none w-full">
          <Sparkles className="w-3.5 h-3.5 text-orange-500/70 shrink-0" />
          <span className="text-xs font-semibold text-foreground/75">{t.adNotice}</span>
          <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
            — {t.adPlaceholderDesc}
          </span>
        </div>
      )}
    </div>
  );
};
