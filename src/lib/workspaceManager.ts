import { WorkspaceTab } from "@/types/workspace";

const STORAGE_KEY_WORKSPACES = "manga_studio_workspaces_v2";
const STORAGE_KEY_ACTIVE_TAB = "manga_studio_active_tab_v2";

export function createDefaultWorkspace(id?: string, name?: string): WorkspaceTab {
  return {
    id: id || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name || "نافذة 1",
    images: [],
    activeImageIndex: 0,
    resultsMap: {},
    selectedImageIds: [],
    view: "upload",
    referenceText: "",
    referenceFileName: "",
    startPageNumber: 1,
    useFilenamePageNumber: true,
    createdAt: Date.now(),
  };
}

export function loadInitialWorkspaces(): { workspaces: WorkspaceTab[]; activeTabId: string } {
  if (typeof window === "undefined") {
    const def = createDefaultWorkspace("tab-1", "نافذة 1");
    return { workspaces: [def], activeTabId: def.id };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
        const activeExists = parsed.some((w) => w.id === savedActive);
        const activeTabId = activeExists && savedActive ? savedActive : parsed[0].id;
        return { workspaces: parsed, activeTabId };
      }
    }

    // Migrate from legacy single-project storage if present
    const legacyImages = localStorage.getItem("manga_studio_images");
    const legacyResults = localStorage.getItem("manga_studio_results");
    const initialWorkspace = createDefaultWorkspace("tab-1", "نافذة 1");

    if (legacyImages) {
      try {
        initialWorkspace.images = JSON.parse(legacyImages);
      } catch {
        // ignore
      }
    }
    if (legacyResults) {
      try {
        initialWorkspace.resultsMap = JSON.parse(legacyResults);
      } catch {
        // ignore
      }
    }

    return { workspaces: [initialWorkspace], activeTabId: initialWorkspace.id };
  } catch (e) {
    console.error("Failed to load workspaces from storage:", e);
    const fallback = createDefaultWorkspace("tab-1", "نافذة 1");
    return { workspaces: [fallback], activeTabId: fallback.id };
  }
}

export function saveWorkspacesToStorage(workspaces: WorkspaceTab[], activeTabId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
  } catch (e) {
    console.warn("Storage quota exceeded or error saving workspaces:", e);
  }
}

export function deriveNextTabName(workspaces: WorkspaceTab[]): string {
  const existingNames = new Set(workspaces.map((w) => w.name.trim()));
  let count = workspaces.length + 1;
  while (existingNames.has(`نافذة ${count}`) || existingNames.has(`Window ${count}`)) {
    count++;
  }
  return `نافذة ${count}`;
}
