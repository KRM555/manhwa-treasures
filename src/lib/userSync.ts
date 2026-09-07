import { TagRule, GlossaryItem, TranslationConfig } from "@/types/manga";
import { TranslationMemoryEntry } from "@/types";
import { WorkspaceTab } from "@/types/workspace";
import { setTranslationMemory } from "./translationMemory";

export const CLOUD_SYNC_RESTORED_EVENT = "cloud_sync_restored";
export const CLOUD_SYNC_STATUS_EVENT = "cloud_sync_status";

export interface UserCloudSettings {
  tags?: TagRule[];
  tagsEnabled?: boolean;
  glossary?: GlossaryItem[];
  translationMemory?: TranslationMemoryEntry[];
  config?: TranslationConfig;
  selectedModel?: string;
  extendedThinking?: boolean;
  processingMode?: string;
  startPageNumber?: number;
  useFilenamePageNumber?: boolean;
}

export interface UserCloudData {
  email: string;
  updatedAt: number;
  settings: UserCloudSettings;
  workspaces?: WorkspaceTab[];
  activeTabId?: string;
}

export async function fetchUserCloudData(email: string): Promise<UserCloudData | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return null;

  try {
    const res = await fetch(`/api/user-sync?email=${encodeURIComponent(cleanEmail)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.success && json.found && json.data) {
      return json.data as UserCloudData;
    }
    return null;
  } catch (err) {
    console.error("[UserSync] Failed to fetch cloud data:", err);
    return null;
  }
}

export function sanitizeWorkspacesForCloudSync(
  workspaces?: WorkspaceTab[],
): WorkspaceTab[] | undefined {
  if (!Array.isArray(workspaces)) return workspaces;
  return workspaces.map((tab) => ({
    ...tab,
    images: (tab.images || []).map((img) => ({
      id: img.id,
      name: img.name,
      // Strip massive base64 or blob URLs to keep payload tiny (<50KB instead of 50MB)
      url: img.url && !img.url.startsWith("data:") && !img.url.startsWith("blob:") ? img.url : "",
    })),
  }));
}

export async function saveUserCloudData(
  email: string,
  payload: {
    settings?: UserCloudSettings;
    workspaces?: WorkspaceTab[];
    activeTabId?: string;
  },
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) return false;

  try {
    const cleanWorkspaces = sanitizeWorkspacesForCloudSync(payload.workspaces);
    const res = await fetch("/api/user-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        settings: payload.settings,
        workspaces: cleanWorkspaces,
        activeTabId: payload.activeTabId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[UserSync] Server responded with error status:", res.status, errText);
      return false;
    }
    const json = await res.json();
    return Boolean(json.success);
  } catch (err) {
    console.error("[UserSync] Failed to save cloud data:", err);
    return false;
  }
}

export function applyCloudDataToLocalStorage(cloudData: UserCloudData): void {
  if (typeof window === "undefined" || !cloudData) return;

  const { settings, workspaces, activeTabId } = cloudData;

  try {
    if (settings) {
      if (settings.tags) {
        localStorage.setItem("custom_manga_tags", JSON.stringify(settings.tags));
      }
      if (typeof settings.tagsEnabled === "boolean") {
        localStorage.setItem("manga_tags_enabled", String(settings.tagsEnabled));
      }
      if (settings.glossary) {
        localStorage.setItem("manga_glossary", JSON.stringify(settings.glossary));
      }
      if (settings.translationMemory) {
        setTranslationMemory(settings.translationMemory);
      }
      if (settings.config) {
        localStorage.setItem("manga_translation_config", JSON.stringify(settings.config));
      }
      if (settings.selectedModel) {
        localStorage.setItem("gemini_selected_model", settings.selectedModel);
      }
      if (typeof settings.extendedThinking === "boolean") {
        localStorage.setItem("gemini_extended_thinking", String(settings.extendedThinking));
      }
      if (settings.processingMode) {
        localStorage.setItem("manga_processing_mode", settings.processingMode);
      }
      if (settings.startPageNumber !== undefined) {
        localStorage.setItem("manga_start_page_number", String(settings.startPageNumber));
      }
      if (settings.useFilenamePageNumber !== undefined) {
        localStorage.setItem(
          "manga_use_filename_page_number",
          String(settings.useFilenamePageNumber),
        );
      }
    }

    if (Array.isArray(workspaces) && workspaces.length > 0) {
      let existingLocalWorkspaces: WorkspaceTab[] = [];
      try {
        const raw = localStorage.getItem("manga_studio_workspaces_v2");
        if (raw) existingLocalWorkspaces = JSON.parse(raw);
      } catch {
        existingLocalWorkspaces = [];
      }

      // Merge: keep local images if available
      const mergedWorkspaces = workspaces.map((cloudTab) => {
        const localTab = existingLocalWorkspaces.find((lt) => lt.id === cloudTab.id);
        if (!localTab) return cloudTab;
        const mergedImages = (cloudTab.images || []).map((cloudImg) => {
          const localImg = (localTab.images || []).find(
            (li) => li.id === cloudImg.id || li.name === cloudImg.name,
          );
          return {
            ...cloudImg,
            url: cloudImg.url || localImg?.url || "",
          };
        });
        return {
          ...cloudTab,
          images: mergedImages,
        };
      });

      localStorage.setItem("manga_studio_workspaces_v2", JSON.stringify(mergedWorkspaces));
      if (activeTabId) {
        localStorage.setItem("manga_studio_active_tab_v2", activeTabId);
      }
    }

    // Dispatch event so active components re-render immediately
    window.dispatchEvent(
      new CustomEvent(CLOUD_SYNC_RESTORED_EVENT, {
        detail: cloudData,
      }),
    );
  } catch (err) {
    console.error("[UserSync] Failed to apply cloud data to localStorage:", err);
  }
}

export const collectCurrentLocalData = gatherLocalDataForCloud;

export function gatherLocalDataForCloud(): {
  settings: UserCloudSettings;
  workspaces: WorkspaceTab[];
  activeTabId: string;
} {
  if (typeof window === "undefined") {
    return { settings: {}, workspaces: [], activeTabId: "" };
  }

  let tags: TagRule[] = [];
  try {
    const raw = localStorage.getItem("custom_manga_tags");
    if (raw) tags = JSON.parse(raw);
  } catch {
    // ignore
  }

  const tagsEnabled = localStorage.getItem("manga_tags_enabled") !== "false";

  let glossary: GlossaryItem[] = [];
  try {
    const raw = localStorage.getItem("manga_glossary");
    if (raw) glossary = JSON.parse(raw);
  } catch {
    // ignore
  }

  let translationMemory: TranslationMemoryEntry[] = [];
  try {
    const raw = localStorage.getItem("manga_translation_memory_v1");
    if (raw) translationMemory = JSON.parse(raw);
  } catch {
    // ignore
  }

  let config: TranslationConfig | undefined;
  try {
    const raw = localStorage.getItem("manga_translation_config");
    if (raw) config = JSON.parse(raw);
  } catch {
    // ignore
  }

  const selectedModel = localStorage.getItem("gemini_selected_model") || "gemini-3.6-flash";
  const extendedThinking = localStorage.getItem("gemini_extended_thinking") === "true";
  const processingMode = localStorage.getItem("manga_processing_mode") || "ocr_and_translate";
  const startPageNumber = Number(localStorage.getItem("manga_start_page_number") || "1");
  const useFilenamePageNumber = localStorage.getItem("manga_use_filename_page_number") !== "false";

  let workspaces: WorkspaceTab[] = [];
  let activeTabId = "";
  try {
    const rawWorkspaces = localStorage.getItem("manga_studio_workspaces_v2");
    if (rawWorkspaces) workspaces = JSON.parse(rawWorkspaces);
    activeTabId = localStorage.getItem("manga_studio_active_tab_v2") || "";
  } catch {
    // ignore
  }

  return {
    settings: {
      tags,
      tagsEnabled,
      glossary,
      translationMemory,
      config,
      selectedModel,
      extendedThinking,
      processingMode,
      startPageNumber,
      useFilenamePageNumber,
    },
    workspaces: sanitizeWorkspacesForCloudSync(workspaces) || [],
    activeTabId,
  };
}

/**
 * Main function called on user login.
 * Checks if cloud data exists for this email:
 * - If yes: restores it to local storage and dispatches update event.
 * - If no: uploads local data to cloud so this device's work is preserved.
 */
export async function syncUserOnLogin(
  email: string,
): Promise<{ restored: boolean; cloudData?: UserCloudData }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { restored: false };
  }

  const cloudData = await fetchUserCloudData(cleanEmail);

  if (
    cloudData &&
    (cloudData.settings || (cloudData.workspaces && cloudData.workspaces.length > 0))
  ) {
    applyCloudDataToLocalStorage(cloudData);
    return { restored: true, cloudData };
  }

  // Cloud is empty for this email, back up the local data now
  const localData = gatherLocalDataForCloud();
  await saveUserCloudData(cleanEmail, localData);
  return { restored: false };
}
