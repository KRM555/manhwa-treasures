import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY_EXEMPT = "manga_ad_exempt_emails";
const STORAGE_KEY_ADMINS = "manga_custom_admins";

// Site owner / default super admin
export const DEFAULT_ADMIN_EMAILS = ["am1relgohary2002@gmail.com"];

// Helper to normalize email
export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
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
export function isEmailAdFree(email?: string | null): boolean {
  if (!email) return false;
  const norm = normalizeEmail(email);
  if (isAdminEmail(norm)) return true;
  const exempts = getAdFreeEmails();
  return exempts.includes(norm);
}

// Add an email to ad-free list
export function addAdFreeEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  if (!norm || !norm.includes("@")) return false;
  const current = getAdFreeEmails();
  if (current.includes(norm)) return true;
  saveAdFreeEmails([...current, norm]);
  return true;
}

// Remove an email from ad-free list
export function removeAdFreeEmail(email: string): boolean {
  const norm = normalizeEmail(email);
  const current = getAdFreeEmails();
  const next = current.filter((e) => e !== norm);
  saveAdFreeEmails(next);
  return true;
}

// React Hook to subscribe to ad-free status and user session
export function useAdStatus() {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [adFreeEmails, setAdFreeEmails] = useState<string[]>(getAdFreeEmails);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdFree, setIsAdFree] = useState<boolean>(false);

  useEffect(() => {
    // 1. Initial auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const email = session?.user?.email ?? null;
      setCurrentUserEmail(email);
      const admin = isAdminEmail(email);
      setIsAdmin(admin);
      setIsAdFree(isEmailAdFree(email));
    });

    // 2. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email ?? null;
      setCurrentUserEmail(email);
      const admin = isAdminEmail(email);
      setIsAdmin(admin);
      setIsAdFree(isEmailAdFree(email));
    });

    // 3. Listen to ad exemption list updates
    const handleExemptionsChanged = (e: Event) => {
      const customEv = e as CustomEvent<string[]>;
      const nextList = customEv.detail || getAdFreeEmails();
      setAdFreeEmails(nextList);
    };

    window.addEventListener("ad_exemptions_changed", handleExemptionsChanged);
    window.addEventListener("storage", () => {
      setAdFreeEmails(getAdFreeEmails());
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("ad_exemptions_changed", handleExemptionsChanged);
    };
  }, []);

  // Recalculate isAdFree whenever currentUserEmail or adFreeEmails changes
  useEffect(() => {
    setIsAdmin(isAdminEmail(currentUserEmail));
    setIsAdFree(isEmailAdFree(currentUserEmail));
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
