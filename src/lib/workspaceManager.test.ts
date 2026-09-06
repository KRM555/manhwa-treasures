import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  createDefaultWorkspace,
  loadInitialWorkspaces,
  saveWorkspacesToStorage,
  deriveNextTabName,
} from "./workspaceManager";
import { WorkspaceTab } from "@/types/workspace";

describe("workspaceManager tests", () => {
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
      value: { localStorage: localStorageMock },
      writable: true,
    });
  });

  beforeEach(() => {
    store = {};
  });

  it("creates a default workspace with correct initial structure", () => {
    const ws = createDefaultWorkspace("test-1", "فصل 1");
    expect(ws.id).toBe("test-1");
    expect(ws.name).toBe("فصل 1");
    expect(ws.images).toEqual([]);
    expect(ws.resultsMap).toEqual({});
    expect(ws.view).toBe("upload");
  });

  it("loads fallback default workspace when storage is empty", () => {
    const { workspaces, activeTabId } = loadInitialWorkspaces();
    expect(workspaces.length).toBe(1);
    expect(workspaces[0].id).toBe(activeTabId);
  });

  it("saves and reloads multiple workspaces cleanly", () => {
    const ws1 = createDefaultWorkspace("w1", "فصل 10");
    const ws2 = createDefaultWorkspace("w2", "فصل 11");
    ws1.images = [{ id: "img-1", url: "data:test", name: "01.jpg" }];
    ws1.resultsMap = {
      "img-1": [{ id: "b1", originalText: "Hello", translatedText: "مرحبا", category: "dialogue" }],
    };

    saveWorkspacesToStorage([ws1, ws2], "w2");

    const loaded = loadInitialWorkspaces();
    expect(loaded.workspaces.length).toBe(2);
    expect(loaded.activeTabId).toBe("w2");
    expect(loaded.workspaces[0].images.length).toBe(1);
    expect(loaded.workspaces[0].resultsMap["img-1"][0].translatedText).toBe("مرحبا");
    expect(loaded.workspaces[1].images.length).toBe(0);
  });

  it("derives non-conflicting tab names dynamically", () => {
    const wsList: WorkspaceTab[] = [
      createDefaultWorkspace("1", "نافذة 1"),
      createDefaultWorkspace("2", "نافذة 2"),
    ];
    const nextName = deriveNextTabName(wsList);
    expect(nextName).toBe("نافذة 3");
  });
});
