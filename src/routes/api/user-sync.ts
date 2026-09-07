import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";

const USER_DATA_DIR = path.join(process.cwd(), "data", "user_data");

function sanitizeEmailFilename(email: string): string {
  const clean = email.trim().toLowerCase();
  return clean.replace(/[^a-z0-9@._-]/gi, "_") + ".json";
}

function ensureDirectoryExists(): void {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export const Route = createFileRoute("/api/user-sync")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: CORS_HEADERS,
        });
      },
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const email = url.searchParams.get("email")?.trim().toLowerCase();

          if (!email || !email.includes("@")) {
            return Response.json(
              { success: false, error: "Invalid or missing email" },
              { status: 400, headers: CORS_HEADERS },
            );
          }

          ensureDirectoryExists();
          const filePath = path.join(USER_DATA_DIR, sanitizeEmailFilename(email));

          if (!fs.existsSync(filePath)) {
            return Response.json({ success: true, found: false }, { headers: CORS_HEADERS });
          }

          const raw = fs.readFileSync(filePath, "utf-8");
          const data = JSON.parse(raw);
          return Response.json({ success: true, found: true, data }, { headers: CORS_HEADERS });
        } catch (err: any) {
          console.error("Error reading user data:", err);
          return Response.json(
            { success: false, error: err?.message || "Internal server error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            email?: string;
            settings?: any;
            workspaces?: any;
            activeTabId?: string;
          };

          const targetEmail = body?.email?.trim().toLowerCase();
          if (!targetEmail || !targetEmail.includes("@")) {
            return Response.json(
              { success: false, error: "Invalid or missing email" },
              { status: 400, headers: CORS_HEADERS },
            );
          }

          ensureDirectoryExists();
          const filePath = path.join(USER_DATA_DIR, sanitizeEmailFilename(targetEmail));

          // If file already exists, read existing so we can merge partial updates
          let existingData: any = {};
          if (fs.existsSync(filePath)) {
            try {
              existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            } catch {
              existingData = {};
            }
          }

          const updatedAt = Date.now();
          const payload = {
            email: targetEmail,
            updatedAt,
            settings: {
              ...(existingData.settings || {}),
              ...(body.settings || {}),
            },
            workspaces:
              body.workspaces !== undefined ? body.workspaces : existingData.workspaces || [],
            activeTabId:
              body.activeTabId !== undefined ? body.activeTabId : existingData.activeTabId || "",
          };

          fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
          return Response.json({ success: true, updatedAt }, { headers: CORS_HEADERS });
        } catch (err: any) {
          console.error("Error saving user data:", err);
          return Response.json(
            { success: false, error: err?.message || "Internal server error" },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
