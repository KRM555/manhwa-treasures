import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  isAdminEmail,
  isEmailAdFree,
  addAdFreeEmail,
  removeAdFreeEmail,
  getAdFreeEmails,
  normalizeEmail,
} from "./adManager";

describe("adManager test suite", () => {
  let store: Record<string, string> = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: localStorageMock,
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      writable: true,
    });
  });

  beforeEach(() => {
    store = {};
  });

  it("normalizes emails properly", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    expect(normalizeEmail(null)).toBe("");
  });

  it("recognizes the super admin email", () => {
    expect(isAdminEmail("kareemelgohary01@gmail.com")).toBe(true);
    expect(isAdminEmail("  KAREEMELGOHARY01@GMAIL.COM ")).toBe(true);
    expect(isAdminEmail("am1relgohary2002@gmail.com")).toBe(false);
    expect(isAdminEmail("random_user@gmail.com")).toBe(false);
  });

  it("considers admin emails ad-free by default", () => {
    expect(isEmailAdFree("kareemelgohary01@gmail.com")).toBe(true);
    expect(isEmailAdFree("free_user@example.com")).toBe(false);
  });

  it("allows granting and revoking ad-free status for any email", () => {
    const targetEmail = "vip_reader@manga.com";
    expect(isEmailAdFree(targetEmail)).toBe(false);

    // Grant
    const added = addAdFreeEmail(targetEmail);
    expect(added).toBe(true);
    expect(isEmailAdFree(targetEmail)).toBe(true);
    expect(getAdFreeEmails()).toContain("vip_reader@manga.com");

    // Revoke
    const removed = removeAdFreeEmail(targetEmail);
    expect(removed).toBe(true);
    expect(isEmailAdFree(targetEmail)).toBe(false);
    expect(getAdFreeEmails()).not.toContain("vip_reader@manga.com");
  });
});
