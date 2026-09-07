import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

const EXEMPT_FILE = path.join(process.cwd(), "data", "ad_exemptions.json");

// Default initial exempt list: only primary system admin
const INITIAL_EXEMPTS = ["kareemelgohary01@gmail.com"];

function readServerExempts(): string[] {
  try {
    if (!fs.existsSync(EXEMPT_FILE)) {
      const dir = path.dirname(EXEMPT_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(EXEMPT_FILE, JSON.stringify(INITIAL_EXEMPTS, null, 2), "utf-8");
      return INITIAL_EXEMPTS;
    }
    const raw = fs.readFileSync(EXEMPT_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : INITIAL_EXEMPTS;
  } catch (e) {
    console.error("Error reading exempt file:", e);
    return INITIAL_EXEMPTS;
  }
}

function writeServerExempts(emails: string[]): void {
  try {
    const dir = path.dirname(EXEMPT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const unique = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    fs.writeFileSync(EXEMPT_FILE, JSON.stringify(unique, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing exempt file:", e);
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export const Route = createFileRoute("/api/ad-exemptions")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },
      GET: async () => {
        const exempts = readServerExempts();
        return Response.json({ success: true, exempts }, { headers: CORS_HEADERS });
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { email?: string; action?: "add" | "remove" };
          const target = body?.email?.trim().toLowerCase();
          const action = body?.action || "add";

          if (!target || !target.includes("@")) {
            return Response.json(
              { success: false, error: "Invalid email" },
              { status: 400, headers: CORS_HEADERS },
            );
          }

          const current = readServerExempts();
          let updated: string[];

          if (action === "remove") {
            updated = current.filter((e) => e !== target);
          } else {
            updated = Array.from(new Set([...current, target]));
          }

          writeServerExempts(updated);
          return Response.json({ success: true, exempts: updated }, { headers: CORS_HEADERS });
        } catch (e: any) {
          return Response.json(
            { success: false, error: e?.message || "Server error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
