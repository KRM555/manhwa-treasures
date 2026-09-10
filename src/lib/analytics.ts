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

export interface ActiveUserInfo {
  sessionId: string;
  email?: string | null;
  isVip?: boolean;
  platform?: string;
  lastSeen?: number;
}

export interface SiteAnalyticsData {
  onlineUsers: number;
  activeUsers: ActiveUserInfo[];
  totalVisits: number;
  todayVisits: number;
  lastUpdated?: string;
}

function getCurrentVisitorInfo() {
  let email: string | null = null;
  let isVip = false;
  try {
    const raw = localStorage.getItem("manga_local_auth_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email) email = parsed.email.trim().toLowerCase();
    }
    isVip =
      localStorage.getItem("manga_vip_activated") === "true" ||
      document.documentElement.getAttribute("data-vip") === "true";
  } catch {
    // ignore
  }
  return {
    email,
    isVip,
    platform:
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mobile")
        ? "mobile"
        : "desktop",
  };
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
      const info = getCurrentVisitorInfo();
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isNewVisit ? "visit" : "heartbeat",
          sessionId,
          ...info,
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
    const info = getCurrentVisitorInfo();
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "heartbeat",
        sessionId,
        ...info,
      }),
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
        const info = getCurrentVisitorInfo();
        await presenceChannel.track({
          onlineAt: new Date().toISOString(),
          ...info,
        });
      }
    });

    // If auth changes, update presence track
    window.addEventListener("storage", () => {
      const info = getCurrentVisitorInfo();
      presenceChannel
        .track({
          onlineAt: new Date().toISOString(),
          ...info,
        })
        .catch(() => {});
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
 * Hook exclusively for Admin to view real-time visits and online count with user identities
 */
export function useAdminAnalytics(isAdmin: boolean) {
  const [stats, setStats] = useState<SiteAnalyticsData>({
    onlineUsers: 1,
    activeUsers: [],
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
          setStats((prev) => {
            const apiUsers: ActiveUserInfo[] = data.activeUsers || [];
            return {
              ...prev,
              onlineUsers: Math.max(data.onlineUsers || 1, apiUsers.length, 1),
              activeUsers: apiUsers,
              totalVisits: data.totalVisits || prev.totalVisits,
              todayVisits: data.todayVisits || prev.todayVisits,
              lastUpdated: data.lastUpdated,
            };
          });
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
          const presenceList: ActiveUserInfo[] = [];
          for (const key of Object.keys(state)) {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const p = presences[0];
              presenceList.push({
                sessionId: key,
                email: p.email || null,
                isVip: !!p.isVip,
                platform: p.platform || "desktop",
              });
            }
          }

          if (presenceList.length > 0) {
            setStats((prev) => {
              // Merge presence users with server users
              const userMap = new Map<string, ActiveUserInfo>();
              for (const u of prev.activeUsers) {
                userMap.set(u.sessionId, u);
              }
              for (const p of presenceList) {
                const existing = userMap.get(p.sessionId);
                userMap.set(p.sessionId, {
                  ...existing,
                  ...p,
                });
              }
              const merged = Array.from(userMap.values());
              return {
                ...prev,
                onlineUsers: Math.max(merged.length, 1),
                activeUsers: merged,
              };
            });
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
