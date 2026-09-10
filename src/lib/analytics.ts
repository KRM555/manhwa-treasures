import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const SESSION_KEY = "manga_visitor_session_id";
const VISIT_LOGGED_KEY = "manga_session_visit_logged";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId =
      "sess_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export interface SiteAnalyticsData {
  onlineUsers: number;
  totalVisits: number;
  todayVisits: number;
  lastUpdated?: string;
}

/**
 * Global background tracker for all users (runs once per page load)
 * Tracks page visits, sends active heartbeats, and tracks Supabase presence
 */
export function initVisitorTracking(): void {
  if (typeof window === "undefined") return;

  const sessionId = getOrCreateSessionId();
  const alreadyLoggedVisit = sessionStorage.getItem(VISIT_LOGGED_KEY);

  // 1. Send visit event to server API
  const sendVisit = async () => {
    try {
      const isNewVisit = !alreadyLoggedVisit;
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isNewVisit ? "visit" : "heartbeat",
          sessionId,
        }),
      });
      if (isNewVisit) {
        sessionStorage.setItem(VISIT_LOGGED_KEY, "true");
      }
    } catch {
      // Ignore background analytics network issues
    }
  };

  sendVisit();

  // 2. Periodic heartbeat every 20 seconds
  const heartbeatInterval = window.setInterval(() => {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "heartbeat", sessionId }),
    }).catch(() => {});
  }, 20000);

  // 3. Leave signal on tab close
  const handleUnload = () => {
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ action: "leave", sessionId })], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/analytics", blob);
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener("pagehide", handleUnload);
  window.addEventListener("beforeunload", handleUnload);

  // 4. Supabase presence tracking for real-time multiplayer presence
  try {
    const presenceChannel = supabase.channel("online_visitors", {
      config: { presence: { key: sessionId } },
    });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          onlineAt: new Date().toISOString(),
          platform: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
        });
      }
    });
  } catch {
    // Supabase presence fallback
  }

  // Cleanup on module reload/unmount
  return () => {
    window.clearInterval(heartbeatInterval);
    window.removeEventListener("pagehide", handleUnload);
    window.removeEventListener("beforeunload", handleUnload);
  };
}

/**
 * Hook exclusively for Admin to view real-time visits and online count
 */
export function useAdminAnalytics(isAdmin: boolean) {
  const [stats, setStats] = useState<SiteAnalyticsData>({
    onlineUsers: 1,
    totalVisits: 0,
    todayVisits: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setStats((prev) => ({
            ...prev,
            onlineUsers: Math.max(data.onlineUsers || 1, prev.onlineUsers),
            totalVisits: data.totalVisits || prev.totalVisits,
            todayVisits: data.todayVisits || prev.todayVisits,
            lastUpdated: data.lastUpdated,
          }));
        }
      }
    } catch (err) {
      console.debug("Failed to fetch admin stats:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    // Initial fetch
    fetchStats();

    // Poll every 12 seconds for fresh admin numbers
    const interval = window.setInterval(fetchStats, 12000);

    // Also listen to Supabase presence for instantaneous real-time sync
    let presenceChannel: any = null;
    try {
      presenceChannel = supabase.channel("online_visitors");
      presenceChannel.on("presence", { event: "sync" }, () => {
        try {
          const state = presenceChannel.presenceState();
          const supabaseOnlineCount = Object.keys(state).length;
          if (supabaseOnlineCount > 0) {
            setStats((prev) => ({
              ...prev,
              onlineUsers: Math.max(supabaseOnlineCount, 1),
            }));
          }
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }

    return () => {
      window.clearInterval(interval);
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [isAdmin, fetchStats]);

  return {
    stats,
    loading,
    refresh: fetchStats,
  };
}
