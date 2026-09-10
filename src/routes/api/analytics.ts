import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

const STATS_FILE = path.join(process.cwd(), "data", "site_stats.json");

interface SiteStats {
  totalVisits: number;
  today: string;
  todayVisits: number;
  lastUpdated: string;
}

// Memory map of active sessions: sessionId -> lastSeen timestamp (ms)
const activeSessions = new Map<string, number>();

// Clean sessions inactive for > 45 seconds
function cleanupActiveSessions(): void {
  const now = Date.now();
  for (const [sessionId, lastSeen] of activeSessions.entries()) {
    if (now - lastSeen > 45000) {
      activeSessions.delete(sessionId);
    }
  }
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readStats(): SiteStats {
  const today = getTodayString();
  try {
    if (!fs.existsSync(STATS_FILE)) {
      const dir = path.dirname(STATS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const initial: SiteStats = {
        totalVisits: 1,
        today,
        todayVisits: 1,
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(STATS_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }

    const raw = fs.readFileSync(STATS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SiteStats;

    // Reset today's count if day has changed
    if (parsed.today !== today) {
      parsed.today = today;
      parsed.todayVisits = 0;
      fs.writeFileSync(STATS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }

    return parsed;
  } catch (err) {
    console.error("Error reading site stats:", err);
    return {
      totalVisits: 1,
      today,
      todayVisits: 1,
      lastUpdated: new Date().toISOString(),
    };
  }
}

function saveStats(stats: SiteStats): void {
  try {
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    stats.lastUpdated = new Date().toISOString();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving site stats:", err);
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },
      GET: async () => {
        cleanupActiveSessions();
        const stats = readStats();
        // Online users count is at least 1 (the requester)
        const onlineCount = Math.max(activeSessions.size, 1);

        return Response.json(
          {
            success: true,
            onlineUsers: onlineCount,
            totalVisits: stats.totalVisits,
            todayVisits: stats.todayVisits,
            lastUpdated: stats.lastUpdated,
          },
          { headers: CORS_HEADERS },
        );
      },
      POST: async ({ request }) => {
        cleanupActiveSessions();
        try {
          const body = (await request.json()) as {
            action?: "visit" | "heartbeat" | "leave";
            sessionId?: string;
          };

          const sessionId = body.sessionId || "anon_" + Math.random().toString(36).substring(2, 9);
          const now = Date.now();

          if (body.action === "leave") {
            activeSessions.delete(sessionId);
            return Response.json(
              { success: true, onlineUsers: Math.max(activeSessions.size, 0) },
              { headers: CORS_HEADERS },
            );
          }

          // Register heartbeat
          activeSessions.set(sessionId, now);

          const stats = readStats();

          // If it's a new visit, increment visit counters
          if (body.action === "visit") {
            stats.totalVisits = (stats.totalVisits || 0) + 1;
            stats.todayVisits = (stats.todayVisits || 0) + 1;
            saveStats(stats);
          }

          const onlineCount = Math.max(activeSessions.size, 1);

          return Response.json(
            {
              success: true,
              onlineUsers: onlineCount,
              totalVisits: stats.totalVisits,
              todayVisits: stats.todayVisits,
            },
            { headers: CORS_HEADERS },
          );
        } catch (err: any) {
          console.error("Error processing analytics update:", err);
          return Response.json(
            { success: false, error: err?.message || "Internal error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
