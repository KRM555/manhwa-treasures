import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const STORAGE_KEY_EXEMPT = "manga_ad_exempt_emails";
export const STORAGE_KEY_ADMINS = "manga_custom_admins";
export const STORAGE_KEY_LOCAL_USER = "manga_local_auth_user";

// Site owners / default super admins (Always exempt and have full admin privileges)
export const DEFAULT_ADMIN_EMAILS = [
  "kareemelgohary01@gmail.com",
  "kareemelgohary02@gmail.com",
  "am1relgohary2002@gmail.com",
];

// Helper to normalize email
export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export interface LocalAuthUser {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

// Read current local user session
export function getLocalAuthUser(): LocalAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Set local user session
export function setLocalAuthUser(user: LocalAuthUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(STORAGE_KEY_LOCAL_USER);
  } else {
    localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(user));
  }
  window.dispatchEvent(new CustomEvent("local_auth_changed", { detail: user }));
}

// Read saved list of exempt emails
export function getAdFreeEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXEMPT);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((e: string) => normalizeEmail(e)) : [];
  } catch (e) {
    console.error("Error reading ad-free emails:", e);
    return [];
  }
}

// Save list of exempt emails
export function saveAdFreeEmails(emails: string[]): void {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(emails.map((e) => normalizeEmail(e)).filter(Boolean)));
  localStorage.setItem(STORAGE_KEY_EXEMPT, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent("ad_exemptions_changed", { detail: unique }));
}

// Check if an email is admin
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const norm = normalizeEmail(email);
  if (DEFAULT_ADMIN_EMAILS.some((adm) => normalizeEmail(adm) === norm)) {
    return true;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMINS);
    if (raw) {
      const extraAdmins: string[] = JSON.parse(raw);
      if (Array.isArray(extraAdmins) && extraAdmins.some((a) => normalizeEmail(a) === norm)) {
        return true;
      }
    }
  } catch {
    // Ignore
  }
  return false;
}

// Check if an email is ad-free (either admin or in exempt list)
export function isEmailAdFree(email?: string | null, customList?: string[]): boolean {
  if (!email) return false;
  const norm = normalizeEmail(email);
  if (isAdminEmail(norm)) return true;
  const exempts = customList || getAdFreeEmails();
  return exempts.includes(norm);
}

// Add an email to ad-free list (syncs to Supabase vip_users & local server)
export function addAdFreeEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  if (!norm || !norm.includes("@")) return false;
  const current = getAdFreeEmails();
  const next = Array.from(new Set([...current, norm]));
  saveAdFreeEmails(next);

  // 1. Sync to Supabase vip_users table
  try {
    supabase
      .from("vip_users")
      .upsert({ email: norm }, { onConflict: "email" })
      .then(({ error }) => {
        if (error) console.debug("Supabase VIP sync note:", error.message);
      })
      .catch(() => {});
  } catch (e) {
    console.debug("Supabase sync caught:", e);
  }

  // 2. Sync with local server API fallback
  if (typeof window !== "undefined" && window.location?.origin) {
    fetch("/api/ad-exemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: norm, action: "add" }),
    }).catch((err) => console.debug("Syncing ad exemption error:", err));
  }
  return true;
}

// Remove an email from ad-free list (deletes from Supabase vip_users & local server)
export function removeAdFreeEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  const current = getAdFreeEmails();
  const next = current.filter((e) => e !== norm);
  saveAdFreeEmails(next);

  // 1. Delete from Supabase vip_users table
  try {
    supabase
      .from("vip_users")
      .delete()
      .eq("email", norm)
      .then(({ error }) => {
        if (error) console.debug("Supabase VIP delete note:", error.message);
      })
      .catch(() => {});
  } catch (e) {
    console.debug("Supabase delete caught:", e);
  }

  // 2. Sync with local server API fallback
  if (typeof window !== "undefined" && window.location?.origin) {
    fetch("/api/ad-exemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: norm, action: "remove" }),
    }).catch((err) => console.debug("Syncing ad exemption removal error:", err));
  }
  return true;
}

// React Hook to subscribe to ad-free status and user session
export function useAdStatus() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return getLocalAuthUser()?.email || null;
  });
  const [adFreeEmails, setAdFreeEmails] = useState<string[]>(getAdFreeEmails);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isAdminEmail(getLocalAuthUser()?.email);
  });
  const [isAdFree, setIsAdFree] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isEmailAdFree(getLocalAuthUser()?.email);
  });

  useEffect(() => {
    // Check for VIP activation link in URL: e.g. ?vip=user@gmail.com
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const vipParam = params.get("vip") || params.get("activate_vip");
        if (vipParam) {
          const normVip = normalizeEmail(vipParam);
          if (normVip && normVip.includes("@")) {
            setLocalAuthUser({
              id: "vip_" + Math.random().toString(36).substring(2, 9),
              email: normVip,
              created_at: new Date().toISOString(),
            });
            // Clean URL query parameter without page reload
            const cleanUrl =
              window.location.pathname + (window.location.hash ? window.location.hash : "");
            window.history.replaceState({}, "", cleanUrl);
          }
        }
      } catch (err) {
        console.debug("VIP URL parse error:", err);
      }
    }

    const checkActiveUser = async (email: string | null, customExempts?: string[]) => {
      // If no Supabase email, fall back to local stored session
      const effectiveEmail = email || getLocalAuthUser()?.email || null;
      setCurrentUserEmail(effectiveEmail);
      const admin = isAdminEmail(effectiveEmail);
      setIsAdmin(admin);
      const currentList = customExempts || getAdFreeEmails();
      const localAdFree = isEmailAdFree(effectiveEmail, currentList);
      setIsAdFree(localAdFree);

      // If not locally recognized as VIP yet, verify directly from Supabase vip_users
      if (!localAdFree && effectiveEmail) {
        const norm = normalizeEmail(effectiveEmail);
        try {
          const { data, error } = await supabase
            .from("vip_users")
            .select("email")
            .eq("email", norm)
            .maybeSingle();
          if (!error && data?.email) {
            setIsAdFree(true);
            const merged = Array.from(new Set([...getAdFreeEmails(), norm]));
            saveAdFreeEmails(merged);
            setAdFreeEmails(merged);
          }
        } catch (e) {
          console.debug("Supabase direct VIP check note:", e);
        }
      }
    };

    // Initial fetch of exempt emails from Supabase vip_users table
    const fetchSupabaseVips = async () => {
      try {
        const { data, error } = await supabase.from("vip_users").select("email");
        if (!error && Array.isArray(data)) {
          const remoteVips = data
            .map((item: { email: string }) => normalizeEmail(item.email))
            .filter(Boolean);
          const current = getAdFreeEmails();
          const merged = Array.from(new Set([...current, ...remoteVips]));
          saveAdFreeEmails(merged);
          setAdFreeEmails(merged);
          checkActiveUser(null, merged);
        }
      } catch (err) {
        console.debug("Supabase VIP query note:", err);
      }
    };
    fetchSupabaseVips();

    // Realtime sync with Supabase vip_users table
    let vipChannel: any = null;
    try {
      vipChannel = supabase
        .channel("vip_users_realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "vip_users" }, () => {
          fetchSupabaseVips();
        })
        .subscribe();
    } catch (e) {
      console.debug("Supabase realtime caught:", e);
    }

    // Initial fetch of exempt emails from central server fallback
    if (typeof window !== "undefined" && window.location?.origin) {
      fetch("/api/ad-exemptions")
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.exempts)) {
            // MERGE with current list, NEVER wipe out Supabase VIPs!
            const merged = Array.from(new Set([...getAdFreeEmails(), ...data.exempts]));
            saveAdFreeEmails(merged);
            setAdFreeEmails(merged);
            checkActiveUser(null, merged);
          }
        })
        .catch(() => {});
    }

    // 1. Initial auth check
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        checkActiveUser(session?.user?.email ?? null);
      })
      .catch(() => {
        checkActiveUser(null);
      });

    // 2. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkActiveUser(session?.user?.email ?? null);
    });

    // 3. Listen to local auth updates
    const handleLocalAuthChanged = (e: Event) => {
      const customEv = e as CustomEvent<LocalAuthUser | null>;
      checkActiveUser(customEv.detail?.email ?? null);
    };
    window.addEventListener("local_auth_changed", handleLocalAuthChanged);

    // 4. Listen to ad exemption list updates
    const handleExemptionsChanged = (e: Event) => {
      const customEv = e as CustomEvent<string[]>;
      const nextList = customEv.detail || getAdFreeEmails();
      setAdFreeEmails(nextList);
    };

    window.addEventListener("ad_exemptions_changed", handleExemptionsChanged);
    window.addEventListener("storage", () => {
      setAdFreeEmails(getAdFreeEmails());
      checkActiveUser(null);
    });

    return () => {
      subscription.unsubscribe();
      if (vipChannel) supabase.removeChannel(vipChannel);
      window.removeEventListener("local_auth_changed", handleLocalAuthChanged);
      window.removeEventListener("ad_exemptions_changed", handleExemptionsChanged);
    };
  }, []);

  // Recalculate isAdFree whenever currentUserEmail or adFreeEmails changes
  useEffect(() => {
    setIsAdmin(isAdminEmail(currentUserEmail));
    setIsAdFree(isEmailAdFree(currentUserEmail, adFreeEmails));
  }, [currentUserEmail, adFreeEmails]);

  return {
    currentUserEmail,
    isAdmin,
    isAdFree,
    adFreeEmails,
    addEmail: addAdFreeEmail,
    removeEmail: removeAdFreeEmail,
  };
}
