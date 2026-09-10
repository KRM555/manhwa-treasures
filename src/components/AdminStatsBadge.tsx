import React from "react";
import { useAdminAnalytics } from "@/lib/analytics";
import { useI18n } from "@/lib/language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Eye, Users, RefreshCw, Activity, CalendarDays } from "lucide-react";

interface AdminStatsBadgeProps {
  isAdmin: boolean;
}

export const AdminStatsBadge: React.FC<AdminStatsBadgeProps> = ({ isAdmin }) => {
  const { lang } = useI18n();
  const { stats, loading, refresh } = useAdminAnalytics(isAdmin);

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-9 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer shadow-xs outline-none"
          title={
            lang === "ar"
              ? "إحصائيات الموقع الحية (خاص بمدير النظام)"
              : "Live Site Analytics (Admin only)"
          }
        >
          {/* Live indicator dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{stats.onlineUsers}</span>
            <span className="text-[10px] font-medium opacity-80">
              {lang === "ar" ? "متصل" : "online"}
            </span>
          </div>

          <span className="h-3.5 w-px bg-emerald-500/30" />

          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>{stats.totalVisits.toLocaleString()}</span>
            <span className="text-[10px] font-medium opacity-80">
              {lang === "ar" ? "زيارة" : "visits"}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={`w-72 p-3.5 rounded-2xl border-emerald-500/30 bg-background/95 backdrop-blur-md shadow-lg ${
          lang === "ar" ? "dir-rtl text-right" : "dir-ltr text-left"
        }`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-foreground">
              {lang === "ar" ? "إحصائيات الموقع المباشرة" : "Live Site Analytics"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refresh()}
            disabled={loading}
            className="h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            title={lang === "ar" ? "تحديث الأرقام" : "Refresh numbers"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {/* المتصلون الآن */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 col-span-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {lang === "ar" ? "المتصلون الآن (أونلاين)" : "Currently Online"}
              </span>
            </div>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.onlineUsers}
            </span>
          </div>

          {/* زيارات اليوم */}
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium">
              <CalendarDays className="w-3 h-3" />
              <span>{lang === "ar" ? "زيارات اليوم" : "Today"}</span>
            </div>
            <span className="text-base font-bold text-foreground mt-1">
              {stats.todayVisits.toLocaleString()}
            </span>
          </div>

          {/* إجمالي الزيارات */}
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-medium">
              <Eye className="w-3 h-3" />
              <span>{lang === "ar" ? "إجمالي الزيارات" : "Total Visits"}</span>
            </div>
            <span className="text-base font-bold text-foreground mt-1">
              {stats.totalVisits.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-3 pt-2 border-t border-border/50">
          {lang === "ar"
            ? "يتم التحديث تلقائياً بشكل لحظي عبر Supabase و Vercel"
            : "Real-time updates via Supabase & server tracking"}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
