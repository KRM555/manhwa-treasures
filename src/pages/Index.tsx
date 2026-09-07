import { AuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import React, { useState, useEffect, useRef } from "react";
import { UploadZone } from "@/components/UploadZone";
import { SidebarInfoCards } from "@/components/SidebarInfoCards";
import { AdSlot } from "@/components/AdSlot";
import { AdvancedGlossaryModal } from "@/components/AdvancedGlossaryModal";
import { TranslationMemoryModal } from "@/components/TranslationMemoryModal";
import { GlobalFindReplaceModal } from "@/components/GlobalFindReplaceModal";
import { SplitBubbleModal } from "@/components/SplitBubbleModal";
import { WorkspaceTabBar } from "@/components/WorkspaceTabBar";
import { DriveImportModal } from "@/components/DriveImportModal";
import { NavigationSidebar } from "@/components/NavigationSidebar";
import { GoogleDocsExportModal } from "@/components/GoogleDocsExportModal";
import { AIProofreaderModal } from "@/components/AIProofreaderModal";
import { VipPerksModal } from "@/components/VipPerksModal";
import { SharedDocumentViewerModal } from "@/components/SharedDocumentViewerModal";
import { downloadPhotoshopJsx } from "@/lib/photoshopScript";
import {
  loadInitialWorkspaces,
  saveWorkspacesToStorage,
  createDefaultWorkspace,
  deriveNextTabName,
} from "@/lib/workspaceManager";
import { WorkspaceTab } from "@/types/workspace";
import {
  DEFAULT_GEMINI_MODELS,
  MODEL_FALLBACK_MAP,
  doesModelSupportThinking,
  fetchSupportedGeminiModels,
} from "@/lib/models";
import { formatGlossaryForPrompt } from "@/lib/glossaryUtils";
import {
  lookupTranslationMemory,
  saveToTranslationMemory,
  getTranslationMemory,
} from "@/lib/translationMemory";
import { parseJsonFromResponse } from "@/lib/geminiParser";
import { formatTextWithRules, buildScriptText } from "@/lib/exportUtils";
import { compareImageFilenames, extractPageNumber } from "@/lib/zipUtils";
import { exportChapterToDocx } from "@/utils/docxExport";
import { parseTagRulesFromText, exportTagsToText } from "@/lib/tagUtils";
import { useAdStatus } from "@/lib/adManager";
import { saveUserCloudData, CLOUD_SYNC_RESTORED_EVENT, UserCloudData } from "@/lib/userSync";
import { Switch } from "@/components/ui/switch";
import { GeminiModelMeta, GlossaryItem } from "@/types";
import { TranslationConfig, MangaPageItem } from "@/types/manga";
import {
  ArrowLeft,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Languages,
  Images,
  Trash2,
  ExternalLink,
  FileText,
  Plus,
  Settings2,
  Play,
  FileDown,
  ChevronDown,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Replace,
  RotateCcw,
  FolderPlus,
  BookOpen,
  Eye,
  EyeOff,
  CircleHelp as HelpCircle,
  Info,
  Paperclip,
  Loader as Loader2,
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  KeyRound,
  Cpu,
  GripVertical,
  Crown,
  Palette,
  Pencil,
  Check,
  Zap,
  Database,
  Layers,
  Hash,
  CheckSquare,
  Square,
  Split,
  CloudDownload,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useI18n } from "@/lib/language";
import { getTagLabel, BRAND_NAME } from "@/lib/i18n";

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
  topPercent?: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  confidence?: number;
  fromTM?: boolean;
}

interface ImageItem {
  id: string;
  url: string;
  name: string;
}

export interface TagRule {
  value: string;
  label: string;
  prefix: string;
  suffix: string;
}

const DEFAULT_TAGS: TagRule[] = [
  { value: "dialogue", label: "حوار (Dialogue)", prefix: '"": ', suffix: "" },
  { value: "thought", label: "أفكار (Thought)", prefix: "(): ", suffix: "" },
  { value: "scream", label: "صراخ (Scream)", prefix: "<>: ", suffix: "" },
  { value: "system", label: "نظام (System)", prefix: "[]: ", suffix: "" },
  { value: "phone", label: "هاتف (Phone)", prefix: "**: ", suffix: "" },
  { value: "narrator", label: "راوي (Narrator)", prefix: "NA: ", suffix: "" },
  { value: "sfx", label: "مؤثر صوتي (SFX)", prefix: "sfx: ", suffix: "" },
  { value: "whisper", label: "همس (Whisper)", prefix: "ST: ", suffix: "" },
  { value: "other", label: "أخرى (Other)", prefix: "", suffix: "" },
];

export default function Index() {
  const { t, lang, toggleLang } = useI18n();

  const [availableModels, setAvailableModels] = useState<GeminiModelMeta[]>(DEFAULT_GEMINI_MODELS);
  const [processingMode, setProcessingMode] = useState<"ocr_and_translate" | "ocr_only">(() => {
    return (localStorage.getItem("manga_processing_mode") as any) || "ocr_and_translate";
  });
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [showTMModal, setShowTMModal] = useState<boolean>(false);
  const [showPageNumberModal, setShowPageNumberModal] = useState<boolean>(false);
  const [showGlobalFindReplaceModal, setShowGlobalFindReplaceModal] = useState<boolean>(false);
  const [splitModalBubble, setSplitModalBubble] = useState<{
    bubble: ExtractedText;
    index: number;
  } | null>(null);
  const [splitInitialSelection, setSplitInitialSelection] = useState<string>("");
  const [copiedBubbleId, setCopiedBubbleId] = useState<string | null>(null);
  const [retranslatingBubbleId, setRetranslatingBubbleId] = useState<string | null>(null);

  // Multi-Workspace (Tabs) System
  const [initialWorkspaceData] = useState(() => loadInitialWorkspaces());
  const [workspaces, setWorkspaces] = useState<WorkspaceTab[]>(
    () => initialWorkspaceData.workspaces,
  );
  const [activeTabId, setActiveTabId] = useState<string>(() => initialWorkspaceData.activeTabId);
  const isSwitchingTabRef = useRef(false);

  const initialTab =
    initialWorkspaceData.workspaces.find((w) => w.id === initialWorkspaceData.activeTabId) ||
    initialWorkspaceData.workspaces[0] ||
    createDefaultWorkspace();

  const [images, setImages] = useState<ImageItem[]>(() => initialTab.images || []);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(
    () => initialTab.activeImageIndex || 0,
  );
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageName, setEditingImageName] = useState<string>("");
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>(
    () => initialTab.selectedImageIds || [],
  );
  const [view, setView] = useState<"upload" | "results">(() => initialTab.view || "upload");

  const [startPageNumber, setStartPageNumber] = useState<number>(
    () => initialTab.startPageNumber ?? 1,
  );
  const [useFilenamePageNumber, setUseFilenamePageNumber] = useState<boolean>(
    () => initialTab.useFilenamePageNumber ?? true,
  );

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [currentProcessingMsg, setCurrentProcessingMsg] = useState<string>("");

  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("gemini_api_key") || import.meta.env["VITE_GEMINI_API_KEY"] || "";
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem("gemini_selected_model") || "gemini-3.6-flash";
  });
  const [extendedThinking, setExtendedThinking] = useState<boolean>(() => {
    return localStorage.getItem("gemini_extended_thinking") === "true";
  });

  const [config, setConfig] = useState<TranslationConfig>(() => {
    const saved = localStorage.getItem("manga_translation_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      targetLanguage: "ar",
      extractSFX: true,
      detectVerticalText: true,
    };
  });

  const [resultsMap, setResultsMap] = useState<Record<string, ExtractedText[]>>(
    () => initialTab.resultsMap || {},
  );

  const [tags, setTags] = useState<TagRule[]>(() => {
    const saved = localStorage.getItem("custom_manga_tags");
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });

  const [tagsEnabled, setTagsEnabled] = useState<boolean>(() => {
    return localStorage.getItem("manga_tags_enabled") !== "false";
  });

  const { currentUserEmail, isVip, isAdFree } = useAdStatus();
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [showGoogleDocsModal, setShowGoogleDocsModal] = useState<boolean>(false);
  const [showProofreaderModal, setShowProofreaderModal] = useState<boolean>(false);
  const [showVipPerksModal, setShowVipPerksModal] = useState<boolean>(false);

  // Listen for global modal open events
  useEffect(() => {
    const handleOpenProofreader = () => setShowProofreaderModal(true);
    const handleOpenVipPerks = () => setShowVipPerksModal(true);
    const handleOpenGoogleDocs = () => setShowGoogleDocsModal(true);

    window.addEventListener("open_proofreader_modal", handleOpenProofreader);
    window.addEventListener("open_vip_perks_modal", handleOpenVipPerks);
    window.addEventListener("open_googledocs_modal", handleOpenGoogleDocs);

    return () => {
      window.removeEventListener("open_proofreader_modal", handleOpenProofreader);
      window.removeEventListener("open_vip_perks_modal", handleOpenVipPerks);
      window.removeEventListener("open_googledocs_modal", handleOpenGoogleDocs);
    };
  }, []);

  // Check for shared team glossary in URL
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const teamGlossaryParam = urlParams.get("team_glossary");
      if (teamGlossaryParam) {
        const parsed: GlossaryItem[] = JSON.parse(decodeURIComponent(teamGlossaryParam));
        if (Array.isArray(parsed) && parsed.length > 0) {
          toast.info(
            lang === "ar"
              ? `تم اكتشاف قاموس فريق مشترك (${parsed.length} مصطلح). هل ترغب في استيراده إلى مشروعك؟`
              : `Found team shared glossary (${parsed.length} terms). Import to project?`,
            {
              duration: 12000,
              action: {
                label: lang === "ar" ? "استيراد القاموس 📥" : "Import 📥",
                onClick: () => {
                  const existingKeys = new Set(
                    glossary.map((g) => g.original.toLowerCase().trim()),
                  );
                  const merged = [...glossary];
                  let added = 0;
                  parsed.forEach((item) => {
                    if (item.original && !existingKeys.has(item.original.toLowerCase().trim())) {
                      merged.push(item);
                      added++;
                    }
                  });
                  setGlossary(merged);
                  toast.success(
                    lang === "ar"
                      ? `تم استيراد ${added} مصطلح بنجاح إلى قاموسك! 👥`
                      : `Imported ${added} terms to your glossary! 👥`,
                  );
                },
              },
            },
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const [glossary, setGlossary] = useState<GlossaryItem[]>(() => {
    const saved = localStorage.getItem("manga_glossary");
    return saved ? JSON.parse(saved) : [];
  });
  const [newGlossaryOrig, setNewGlossaryOrig] = useState("");
  const [newGlossaryTrans, setNewGlossaryTrans] = useState("");

  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagPrefix, setNewTagPrefix] = useState("");
  const [newTagSuffix, setNewTagSuffix] = useState("");
  const [showTagFormatHelp, setShowTagFormatHelp] = useState(false);
  const tagFileInputRef = useRef<HTMLInputElement>(null);

  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const [referenceText, setReferenceText] = useState<string>(() => initialTab.referenceText || "");
  const [referenceFileName, setReferenceFileName] = useState<string>(
    () => initialTab.referenceFileName || "",
  );
  const [showKeyHelpModal, setShowKeyHelpModal] = useState<boolean>(false);
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [showTagSettingsModal, setShowTagSettingsModal] = useState<boolean>(false);
  const [showHowToUseModal, setShowHowToUseModal] = useState<boolean>(false);
  const [reAnalysisNote, setReAnalysisNote] = useState<string>("");

  // Synchronize active tab state with the workspaces collection
  useEffect(() => {
    if (isSwitchingTabRef.current) {
      isSwitchingTabRef.current = false;
      return;
    }
    setWorkspaces((prev) => {
      const idx = prev.findIndex((w) => w.id === activeTabId);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (
        current.images === images &&
        current.activeImageIndex === activeImageIndex &&
        current.resultsMap === resultsMap &&
        current.selectedImageIds === selectedImageIds &&
        current.view === view &&
        current.startPageNumber === startPageNumber &&
        current.useFilenamePageNumber === useFilenamePageNumber &&
        current.referenceText === referenceText &&
        current.referenceFileName === referenceFileName
      ) {
        return prev;
      }
      const updated = [...prev];
      updated[idx] = {
        ...current,
        images,
        activeImageIndex,
        resultsMap,
        selectedImageIds,
        view,
        startPageNumber,
        useFilenamePageNumber,
        referenceText,
        referenceFileName,
      };
      return updated;
    });
  }, [
    activeTabId,
    images,
    activeImageIndex,
    resultsMap,
    selectedImageIds,
    view,
    startPageNumber,
    useFilenamePageNumber,
    referenceText,
    referenceFileName,
  ]);

  // Persist all workspaces to localStorage
  useEffect(() => {
    saveWorkspacesToStorage(workspaces, activeTabId);
  }, [workspaces, activeTabId]);

  useEffect(() => {
    localStorage.setItem("gemini_selected_model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("gemini_extended_thinking", String(extendedThinking));
  }, [extendedThinking]);

  useEffect(() => {
    localStorage.setItem("manga_processing_mode", processingMode);
  }, [processingMode]);

  useEffect(() => {
    localStorage.setItem("manga_translation_config", JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem("custom_manga_tags", JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem("manga_tags_enabled", String(tagsEnabled));
  }, [tagsEnabled]);

  // Listen for Cloud Sync restorations (e.g. on login or multi-device restore)
  useEffect(() => {
    const handleCloudSync = (e: Event) => {
      const customEv = e as CustomEvent<UserCloudData>;
      const data = customEv.detail;
      if (!data) return;

      if (data.settings) {
        if (Array.isArray(data.settings.tags)) setTags(data.settings.tags);
        if (typeof data.settings.tagsEnabled === "boolean")
          setTagsEnabled(data.settings.tagsEnabled);
        if (Array.isArray(data.settings.glossary)) setGlossary(data.settings.glossary);
        if (data.settings.config) setConfig(data.settings.config);
        if (data.settings.selectedModel) setSelectedModel(data.settings.selectedModel);
        if (typeof data.settings.extendedThinking === "boolean")
          setExtendedThinking(data.settings.extendedThinking);
        if (data.settings.processingMode) setProcessingMode(data.settings.processingMode as any);
        if (typeof data.settings.startPageNumber === "number")
          setStartPageNumber(data.settings.startPageNumber);
        if (typeof data.settings.useFilenamePageNumber === "boolean")
          setUseFilenamePageNumber(data.settings.useFilenamePageNumber);
      }
      if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
        if (data.activeTabId) setActiveTabId(data.activeTabId);
      }
    };

    window.addEventListener(CLOUD_SYNC_RESTORED_EVENT, handleCloudSync);
    return () => {
      window.removeEventListener(CLOUD_SYNC_RESTORED_EVENT, handleCloudSync);
    };
  }, []);

  // Debounced auto-save to cloud account whenever user settings or workspaces change
  useEffect(() => {
    if (!currentUserEmail) return;

    const timer = setTimeout(() => {
      saveUserCloudData(currentUserEmail, {
        settings: {
          tags,
          tagsEnabled,
          glossary,
          translationMemory: getTranslationMemory(),
          config,
          selectedModel,
          extendedThinking,
          processingMode,
          startPageNumber,
          useFilenamePageNumber,
        },
        workspaces,
        activeTabId,
      }).catch((err) => {
        console.debug("[UserSync] Auto-save error note:", err);
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    currentUserEmail,
    tags,
    tagsEnabled,
    glossary,
    config,
    selectedModel,
    extendedThinking,
    processingMode,
    startPageNumber,
    useFilenamePageNumber,
    workspaces,
    activeTabId,
  ]);

  useEffect(() => {
    localStorage.setItem("manga_glossary", JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    try {
      localStorage.setItem("manga_studio_results", JSON.stringify(resultsMap));
    } catch (e) {
      console.warn("Storage limit reached for results");
    }
  }, [resultsMap]);

  useEffect(() => {
    try {
      localStorage.setItem("manga_studio_images", JSON.stringify(images));
    } catch (e) {
      console.warn("Storage limit reached for images");
    }
  }, [images]);

  useEffect(() => {
    localStorage.setItem("manga_start_page_number", startPageNumber.toString());
  }, [startPageNumber]);

  useEffect(() => {
    localStorage.setItem("manga_use_filename_page_number", useFilenamePageNumber.toString());
  }, [useFilenamePageNumber]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const activeImage = images[activeImageIndex] || null;
  const currentItems = activeImage ? resultsMap[activeImage.id] || [] : [];

  const getDisplayPageNumber = (img?: ImageItem | null, idx?: number): number => {
    if (useFilenamePageNumber && img) {
      const detected = extractPageNumber(img.name);
      if (detected !== null && detected > 0) return detected;
    }
    return (startPageNumber || 1) + (idx !== undefined ? idx : 0);
  };

  // Strip spaces and surrounding quotes cleanly
  const cleanApiKey = apiKey.replace(/[\s\r\n\t"']/g, "").trim();

  const getEffectiveModel = () =>
    availableModels.find((m) => m.id === selectedModel)?.label || selectedModel;

  // Auto-fetch supported models whenever cleanApiKey looks valid
  useEffect(() => {
    if (cleanApiKey && cleanApiKey.startsWith("AIzaSy")) {
      fetchSupportedGeminiModels(cleanApiKey).then(({ filteredModels }) => {
        if (filteredModels && filteredModels.length > 0) {
          setAvailableModels(filteredModels);
          // If current selection is not in the verified list, adjust to first valid
          setSelectedModel((prev) =>
            filteredModels.some((m) => m.id === prev) ? prev : filteredModels[0].id,
          );
        }
      });
    }
  }, [cleanApiKey]);

  const handleTestApiKey = async () => {
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      return;
    }

    setIsTestingKey(true);
    try {
      const { allRemoteIds, filteredModels, error } = await fetchSupportedGeminiModels(cleanApiKey);

      if (error) {
        toast.error(t.googleError(error), { duration: 6000 });
        if (cleanApiKey.startsWith("AQ.")) {
          setShowKeyHelpModal(true);
        }
      } else {
        setAvailableModels(filteredModels);
        if (filteredModels.length > 0 && !filteredModels.some((m) => m.id === selectedModel)) {
          setSelectedModel(filteredModels[0].id);
        }
        toast.success(t.keyValid(allRemoteIds.length));
      }
    } catch (err: any) {
      toast.error(t.connectionFailed(err.message));
    } finally {
      setIsTestingKey(false);
    }
  };

  const MAX_IMAGES_LIMIT = 25;

  const handleImageSelected = (url: string, name: string) => {
    if (images.length >= MAX_IMAGES_LIMIT) {
      toast.error(t.multiImageLimit);
      return;
    }
    const newImage: ImageItem = { id: `img_${Date.now()}_${Math.random()}`, url, name };
    const detected = extractPageNumber(name);
    if (images.length === 0 && detected !== null && detected > 0) {
      setStartPageNumber(detected);
    }
    setImages((prev) => {
      const combined = [...prev, newImage];
      return combined.sort((a, b) => compareImageFilenames(a.name, b.name));
    });
    setActiveImageIndex(images.length);
  };

  const handleMultipleImagesSelected = (newImages: { url: string; name: string }[]) => {
    // Sort newly uploaded images naturally by filename/number
    const sortedNew = [...newImages].sort((a, b) => compareImageFilenames(a.name, b.name));

    const formatted = sortedNew.map((img) => ({
      id: `img_${Date.now()}_${Math.random()}`,
      url: img.url,
      name: img.name,
    }));

    // Auto-detect starting page number if the first image has a page number
    if (sortedNew.length > 0) {
      const firstNum = extractPageNumber(sortedNew[0].name);
      if (firstNum !== null && firstNum > 0) {
        if (images.length === 0 || firstNum > 1) {
          setStartPageNumber(firstNum);
        }
      }
    }

    setImages((prev) => {
      const combined = [...prev, ...formatted].slice(0, MAX_IMAGES_LIMIT);
      return combined.sort((a, b) => compareImageFilenames(a.name, b.name));
    });
    setActiveImageIndex(0);
  };

  const handleSortImagesNumerically = () => {
    if (images.length <= 1) return;
    const sorted = [...images].sort((a, b) => compareImageFilenames(a.name, b.name));
    setImages(sorted);
    setActiveImageIndex(0);
    toast.success(t.sortPagesDone);
  };

  const toggleSelectImage = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSelectAllImages = () => {
    setSelectedImageIds(images.map((img) => img.id));
  };

  const handleDeselectAllImages = () => {
    setSelectedImageIds([]);
  };

  const handleRemoveImage = (index: number) => {
    const imgToRemove = images[index];
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);

    if (imgToRemove) {
      setSelectedImageIds((prev) => prev.filter((id) => id !== imgToRemove.id));
      const newMap = { ...resultsMap };
      delete newMap[imgToRemove.id];
      setResultsMap(newMap);
    }

    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleReorderImages = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= images.length ||
      toIndex >= images.length
    )
      return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(toIndex, 0, moved);
    setImages(reordered);
    setActiveImageIndex((current) => {
      if (current === fromIndex) return toIndex;
      if (fromIndex < current && current <= toIndex) return current - 1;
      if (toIndex <= current && current < fromIndex) return current + 1;
      return current;
    });
  };

  const startRenameImage = (image: ImageItem) => {
    setEditingImageId(image.id);
    setEditingImageName(image.name);
  };

  const saveImageName = () => {
    if (!editingImageId) return;
    const nextName = editingImageName.trim();
    if (!nextName) {
      toast.error("اسم الصفحة لا يمكن أن يكون فارغًا");
      return;
    }
    setImages((prev) =>
      prev.map((image) => (image.id === editingImageId ? { ...image, name: nextName } : image)),
    );
    setEditingImageId(null);
    setEditingImageName("");
  };

  const handleSelectTab = (nextTabId: string) => {
    if (nextTabId === activeTabId) return;
    const targetTab = workspaces.find((w) => w.id === nextTabId);
    if (!targetTab) return;

    isSwitchingTabRef.current = true;

    // First save the current tab values to workspaces immediately
    setWorkspaces((prev) =>
      prev.map((w) =>
        w.id === activeTabId
          ? {
              ...w,
              images,
              activeImageIndex,
              resultsMap,
              selectedImageIds,
              view,
              startPageNumber,
              useFilenamePageNumber,
              referenceText,
              referenceFileName,
            }
          : w,
      ),
    );

    // Switch states to the target tab
    setImages(targetTab.images || []);
    setActiveImageIndex(targetTab.activeImageIndex || 0);
    setResultsMap(targetTab.resultsMap || {});
    setSelectedImageIds(targetTab.selectedImageIds || []);
    setView(targetTab.view || "upload");
    setStartPageNumber(targetTab.startPageNumber ?? 1);
    setUseFilenamePageNumber(targetTab.useFilenamePageNumber ?? true);
    setReferenceText(targetTab.referenceText || "");
    setReferenceFileName(targetTab.referenceFileName || "");
    setActiveTabId(nextTabId);
  };

  const handleCreateTab = () => {
    const newName = deriveNextTabName(workspaces);
    const newTab = createDefaultWorkspace(undefined, newName);

    isSwitchingTabRef.current = true;

    // Save current tab before creating new
    const updatedWorkspaces = workspaces.map((w) =>
      w.id === activeTabId
        ? {
            ...w,
            images,
            activeImageIndex,
            resultsMap,
            selectedImageIds,
            view,
            startPageNumber,
            useFilenamePageNumber,
            referenceText,
            referenceFileName,
          }
        : w,
    );

    const nextWorkspaces = [...updatedWorkspaces, newTab];
    setWorkspaces(nextWorkspaces);

    // Switch to new tab
    setImages([]);
    setActiveImageIndex(0);
    setResultsMap({});
    setSelectedImageIds([]);
    setView("upload");
    setStartPageNumber(1);
    setUseFilenamePageNumber(true);
    setReferenceText("");
    setReferenceFileName("");
    setActiveTabId(newTab.id);
    toast.success(lang === "ar" ? `تم فتح ${newName}` : `Created ${newName}`);
  };

  const handleCloseTab = (tabIdToClose: string) => {
    if (workspaces.length <= 1) {
      toast.info(t.cannotCloseOnlyTab);
      return;
    }

    const filtered = workspaces.filter((w) => w.id !== tabIdToClose);
    setWorkspaces(filtered);

    if (activeTabId === tabIdToClose) {
      isSwitchingTabRef.current = true;
      const closingIdx = workspaces.findIndex((w) => w.id === tabIdToClose);
      const nextIdx = Math.max(0, closingIdx - 1);
      const nextTab = filtered[nextIdx] || filtered[0];

      setImages(nextTab.images || []);
      setActiveImageIndex(nextTab.activeImageIndex || 0);
      setResultsMap(nextTab.resultsMap || {});
      setSelectedImageIds(nextTab.selectedImageIds || []);
      setView(nextTab.view || "upload");
      setStartPageNumber(nextTab.startPageNumber ?? 1);
      setUseFilenamePageNumber(nextTab.useFilenamePageNumber ?? true);
      setReferenceText(nextTab.referenceText || "");
      setReferenceFileName(nextTab.referenceFileName || "");
      setActiveTabId(nextTab.id);
    }
  };

  const handleRenameTab = (tabId: string, newName: string) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === tabId ? { ...w, name: newName } : w)));
  };

  const handleDuplicateTab = (tabId: string) => {
    const srcTab = workspaces.find((w) => w.id === tabId);
    if (!srcTab) return;

    const srcImages = tabId === activeTabId ? images : srcTab.images;
    const srcResults = tabId === activeTabId ? resultsMap : srcTab.resultsMap;
    const srcActiveIdx = tabId === activeTabId ? activeImageIndex : srcTab.activeImageIndex;
    const srcView = tabId === activeTabId ? view : srcTab.view;

    const dupName = `${srcTab.name} (${lang === "ar" ? "نسخة" : "Copy"})`;
    const dupTab: WorkspaceTab = {
      ...createDefaultWorkspace(undefined, dupName),
      images: JSON.parse(JSON.stringify(srcImages || [])),
      activeImageIndex: srcActiveIdx,
      resultsMap: JSON.parse(JSON.stringify(srcResults || {})),
      selectedImageIds: [],
      view: srcView,
      startPageNumber: srcTab.startPageNumber ?? 1,
      useFilenamePageNumber: srcTab.useFilenamePageNumber ?? true,
      referenceText: srcTab.referenceText || "",
      referenceFileName: srcTab.referenceFileName || "",
    };

    setWorkspaces((prev) => [...prev, dupTab]);
    toast.success(
      lang === "ar" ? `تم تكرار "${srcTab.name}" بنجاح` : `Duplicated "${srcTab.name}"`,
    );
  };

  const handleClearAllImages = () => {
    setImages([]);
    setSelectedImageIds([]);
    setActiveImageIndex(0);
    setResultsMap({});
    setReferenceText("");
    setReferenceFileName("");
    setStartPageNumber(1);
    toast.success(t.newProjectStarted);
  };

  const handleDriveImagesImported = (importedImages: { url: string; name: string }[]) => {
    const existingNames = new Set(images.map((img) => img.name));
    const newItems = importedImages
      .filter((img) => !existingNames.has(img.name))
      .map((img, i) => ({
        id: `img-drive-${Date.now()}-${i}`,
        url: img.url,
        name: img.name,
      }));

    if (newItems.length === 0) {
      toast.info(
        lang === "ar"
          ? "جميع الصور موجودة بالفعل في المشروع"
          : "All images already exist in project",
      );
      return;
    }

    const combined = [...images, ...newItems];
    const limited = combined.slice(0, MAX_IMAGES_LIMIT);
    if (combined.length > MAX_IMAGES_LIMIT) {
      toast.warning(t.maxLimitReached(MAX_IMAGES_LIMIT));
    }
    setImages(limited);
    toast.success(
      lang === "ar"
        ? `تمت إضافة ${newItems.length} صفحة من Google Drive بنجاح`
        : `Added ${newItems.length} pages from Google Drive`,
    );
  };

  const handleSaveApiKey = (key: string) => {
    const cleaned = key.replace(/[\s\r\n\t"']/g, "").trim();
    setApiKey(cleaned);
    localStorage.setItem("gemini_api_key", cleaned);
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceText(event.target?.result as string);
      setReferenceFileName(file.name);
      toast.success(t.referenceImported);
    };
    reader.readAsText(file);
  };

  const handleAddCustomTag = () => {
    if (!newTagLabel.trim()) {
      toast.error(t.tagNameRequired);
      return;
    }
    const val = `custom_${Date.now()}`;
    const newTag: TagRule = {
      value: val,
      label: newTagLabel,
      prefix: newTagPrefix,
      suffix: newTagSuffix,
    };
    setTags([...tags, newTag]);
    setNewTagLabel("");
    setNewTagPrefix("");
    setNewTagSuffix("");
    toast.success(t.tagAdded);
  };

  const handleDeleteTag = (index: number) => {
    if (tags.length <= 1) {
      toast.error(t.tagDeleteLastError);
      return;
    }
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleImportTagsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || !content.trim()) {
        toast.error(t.tagsImportError);
        return;
      }

      const result = parseTagRulesFromText(content, tags);
      if (result.totalParsed === 0) {
        toast.error(t.tagsImportError);
        return;
      }

      setTags(result.tags);
      toast.success(t.tagsImportSuccess.replace("{count}", String(result.totalParsed)));
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportTagsFile = () => {
    const textContent = exportTagsToText(tags);
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manga_tags_settings_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      lang === "ar"
        ? "تم تصدير ملف إعدادات العلامات بنجاح!"
        : "Tag settings exported successfully!",
    );
  };

  const handleAddGlossaryItem = () => {
    if (!newGlossaryOrig.trim() || !newGlossaryTrans.trim()) {
      toast.error(t.glossaryFieldsRequired);
      return;
    }
    const item: GlossaryItem = {
      id: `g_${Date.now()}`,
      original: newGlossaryOrig.trim(),
      translation: newGlossaryTrans.trim(),
    };
    setGlossary([...glossary, item]);
    setNewGlossaryOrig("");
    setNewGlossaryTrans("");
    toast.success(t.glossaryAdded);
  };

  const handleDeleteGlossaryItem = (id: string) => {
    setGlossary(glossary.filter((item) => item.id !== id));
  };

  const formatItemText = (text: string, categoryVal: string): string => {
    return formatTextWithRules(text, categoryVal, tags, tagsEnabled);
  };

  const handleManualCloudSync = async () => {
    if (!currentUserEmail) {
      toast.info(
        lang === "ar"
          ? "يرجى تسجيل الدخول أولاً لتفعيل المزامنة السحابية وحفظ إعداداتك ومساحة عملك."
          : "Please sign in first to enable cloud sync.",
      );
      return;
    }
    setIsSyncingCloud(true);
    try {
      const success = await saveUserCloudData(currentUserEmail, {
        settings: {
          tags,
          tagsEnabled,
          glossary,
          translationMemory: getTranslationMemory(),
          config,
          selectedModel,
          extendedThinking,
          processingMode,
          startPageNumber,
          useFilenamePageNumber,
        },
        workspaces,
        activeTabId,
      });
      if (success) {
        toast.success(
          lang === "ar"
            ? "تمت مزامنة وحفظ جميع إعداداتك ومساحات عملك سحابياً بنجاح! ☁️"
            : "All settings and workspaces synced to cloud successfully! ☁️",
        );
      } else {
        toast.error(lang === "ar" ? "تعذر الاتصال بالسيرفر للمزامنة" : "Cloud sync failed");
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (!activeImage) return;
    const items = [...currentItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index]!;
    items[index] = items[targetIndex]!;
    items[targetIndex] = temp;

    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  const handleQuickCopyTranslation = (bubbleId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text.trim());
    setCopiedBubbleId(bubbleId);
    toast.success(t.copiedTranslationText);
    setTimeout(() => {
      setCopiedBubbleId((prev) => (prev === bubbleId ? null : prev));
    }, 2000);
  };

  const handleHighlightBubble = (bubbleId: string) => {
    setHoveredItemId(bubbleId);
    setTimeout(() => {
      const el = document.getElementById(`bubble-card-${bubbleId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  const handleOpenSplitModal = (
    bubble: ExtractedText,
    index: number,
    initialSelection: string = "",
  ) => {
    setSplitModalBubble({ bubble, index });
    setSplitInitialSelection(initialSelection);
  };

  const handleConfirmSplitBubble = (
    bubbleId: string,
    part1: { originalText: string; translatedText: string; category: string },
    part2: { originalText: string; translatedText: string; category: string },
  ) => {
    if (!activeImage) return;
    const items = [...currentItems];
    const index = items.findIndex((i) => i.id === bubbleId);
    if (index === -1) return;

    const current = items[index]!;
    const newBubbleId = crypto.randomUUID();
    const baseTop = current.topPercent ?? (index + 1) * 15;

    const updatedCurrent: ExtractedText = {
      ...current,
      originalText: part1.originalText,
      translatedText: part1.translatedText,
      category: part1.category,
    };

    const newBubble: ExtractedText = {
      id: newBubbleId,
      originalText: part2.originalText,
      translatedText: part2.translatedText,
      category: part2.category,
      topPercent: Math.min(baseTop + 7, 96),
      leftPercent: current.leftPercent,
      widthPercent: current.widthPercent,
      heightPercent: current.heightPercent,
      confidence: current.confidence,
    };

    items.splice(index, 1, updatedCurrent, newBubble);
    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
    toast.success(t.splitSuccess);
  };

  const handleInsertBubbleBelow = (index: number) => {
    if (!activeImage) return;
    const items = [...currentItems];
    const current = items[index];
    const newBubbleId = crypto.randomUUID();
    const baseTop = current?.topPercent ?? (index + 1) * 15;

    const newBubble: ExtractedText = {
      id: newBubbleId,
      originalText: "",
      translatedText: "",
      category: current?.category || "dialogue",
      topPercent: Math.min(baseTop + 6, 96),
      leftPercent: current?.leftPercent,
      widthPercent: current?.widthPercent,
      heightPercent: current?.heightPercent,
    };

    items.splice(index + 1, 0, newBubble);
    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
    toast.success(t.bubbleAddedSuccess);
  };

  const handleAddNewBubble = () => {
    if (!activeImage) return;
    const items = [...currentItems];
    const newBubbleId = crypto.randomUUID();
    const lastItem = items[items.length - 1];
    const baseTop = lastItem?.topPercent
      ? Math.min(lastItem.topPercent + 7, 96)
      : Math.min((items.length + 1) * 15, 96);

    const newBubble: ExtractedText = {
      id: newBubbleId,
      originalText: "",
      translatedText: "",
      category: "dialogue",
      topPercent: baseTop,
    };

    items.push(newBubble);
    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
    toast.success(t.bubbleAddedSuccess);
  };

  const handleDeleteBubble = (bubbleId: string) => {
    if (!activeImage) return;
    const items = currentItems.filter((i) => i.id !== bubbleId);
    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
    toast.success(t.bubbleDeletedSuccess);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowGlobalFindReplaceModal(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && view === "results") {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          e.preventDefault();
          setShowGlobalFindReplaceModal(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  const handleCopyPageFormatted = () => {
    if (currentItems.length === 0) return;
    const fullText = currentItems
      .map((item) => formatItemText(item.translatedText, item.category))
      .join("\n\n");
    navigator.clipboard.writeText(fullText);
    toast.success(t.copied);
  };

  const handleFindAndReplace = (scope: "current" | "all") => {
    if (!findText.trim()) return;

    let totalReplacements = 0;
    const newMap = { ...resultsMap };

    const processList = (list: ExtractedText[]) => {
      return list.map((item) => {
        let updatedTranslated = item.translatedText;
        if (updatedTranslated.includes(findText)) {
          const count = updatedTranslated.split(findText).length - 1;
          totalReplacements += count;
          updatedTranslated = updatedTranslated.split(findText).join(replaceText);
        }
        return { ...item, translatedText: updatedTranslated };
      });
    };

    if (scope === "current" && activeImage) {
      if (newMap[activeImage.id]) {
        newMap[activeImage.id] = processList(newMap[activeImage.id]!);
      }
    } else {
      Object.keys(newMap).forEach((imgId) => {
        newMap[imgId] = processList(newMap[imgId]!);
      });
    }

    setResultsMap(newMap);
    toast.success(t.replacedOccurrences(totalReplacements));
  };

  const processGeminiRequest = async (
    targetImg: ImageItem,
    ocrOnly = false,
    reAnalysisHint?: string,
  ): Promise<{ data: ExtractedText[] | null; error?: string }> => {
    if (!cleanApiKey) {
      return { data: null, error: t.emptyApiKey };
    }

    const mimeTypeMatch = targetImg.url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = targetImg.url.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

    const glossaryPrompt = formatGlossaryForPrompt(glossary, config.targetLanguage);

    const refContextPrompt = referenceText
      ? `\nIMPORTANT CONTEXT: Use the following text from a previous chapter as a reference to maintain consistent tone, style, and character naming:\n"""\n${referenceText.substring(0, 5000)}\n"""\n`
      : "";

    const reAnalysisPrompt = reAnalysisHint?.trim()
      ? `\nCRITICAL — RE-ANALYSIS INSTRUCTIONS FROM THE USER:\nThe user reports that some text regions were missed or incorrectly extracted in a previous analysis.\nPay special attention to the following user notes and make sure to explicitly scan and extract the requested areas:\n"""\n${reAnalysisHint.trim()}\n"""\nRe-examine the entire image carefully, focusing on the areas the user mentioned. Include ALL text blocks, especially any that were previously missed.\n`
      : "";

    const activeTags = config.extractSFX ? tags : tags.filter((t) => t.value !== "sfx");

    const tagDefinitions = activeTags
      .map(
        (t) =>
          `- value: "${t.value}" | label: "${t.label}" | prefix: "${t.prefix}" | suffix: "${t.suffix}"`,
      )
      .join("\n");
    const tagValues = activeTags.map((t) => t.value).join(", ");

    const sfxPromptRule = config.extractSFX
      ? `Extract dialogue, narration, thoughts, and sound effects (SFX / onomatopoeia).`
      : `CRITICAL MANDATE — NO SOUND EFFECTS (SFX):
The user has EXPLICITLY DISABLED sound effects (SFX) extraction.
You MUST COMPLETELY SKIP, IGNORE, and NEVER extract or translate sound effects, onomatopoeia, sound words, or action sounds (e.g. BAM, CRASH, BOOM, WHOOSH, ドン, パチ, 쿵, 쾅, etc.) drawn in or around panels.
Extract ONLY spoken character dialogues, narration boxes, internal thoughts, phone messages, and system windows.
Do NOT output any sound effect items, and NEVER use category "sfx".`;

    const orientationRule = config.detectVerticalText
      ? `Detect and read both horizontal and vertical text layouts (traditional manga vertical reading order: top-to-bottom, right-to-left).`
      : `Detect and read horizontal text layouts.`;

    const tagInstructions = `IMPORTANT — TAG CLASSIFICATION RULES:
You must classify each extracted text block into one of the following currently active custom tags.
Do NOT use any default or built-in categories. Use ONLY the tags listed below.
If a block does not clearly fit any tag, use the last tag in the list as a fallback.
The "category" field in your JSON output must be exactly the value string (not the label).

Active tags (use only these):
${tagDefinitions}`;

    const cleanOutputRule = !tagsEnabled
      ? `\nCRITICAL MANDATE — NO TAGS / CLEAN PLAIN TEXT:
The user has turned OFF tag formatting. Do NOT wrap translatedText or originalText in any prefix, suffix, brackets, or labels. Return pure, natural plain text only.\n`
      : "";

    const coordinatesInstruction = `Estimate bubble bounding box percentages and confidence for each text bubble/region on the image:
- topPercent: vertical position from top of page (0 to 100, number)
- leftPercent: horizontal position from left of page (0 to 100, number)
- widthPercent: approximate width of the bubble (e.g. 10 to 45, number)
- heightPercent: approximate height of the bubble (e.g. 5 to 30, number)
- confidence: OCR and translation confidence score between 0.0 and 1.0 (e.g. 0.95, number)`;

    const promptText = ocrOnly
      ? `You are an expert manga and webtoon OCR system.
Extract all original texts top to bottom in natural reading order.
${sfxPromptRule}
${orientationRule}
${coordinatesInstruction}
${tagInstructions}
${cleanOutputRule}
${reAnalysisPrompt}
Return ONLY a valid JSON array of objects with keys: id, originalText, translatedText, category, topPercent, leftPercent, widthPercent, heightPercent, confidence.
The category field must be one of: (${tagValues}).`
      : `You are an expert manga and webtoon OCR and translator.
Extract all texts from the image in reading order (top to bottom).
${sfxPromptRule}
${orientationRule}
${coordinatesInstruction}
${tagInstructions}
${cleanOutputRule}
${reAnalysisPrompt}
Translate all extracted texts to ${config.targetLanguage === "ar" ? "Arabic (العربية)" : "English"}.
${glossaryPrompt}
${refContextPrompt}
Return ONLY a valid JSON array of objects with keys: id, originalText, translatedText, category, topPercent, leftPercent, widthPercent, heightPercent, confidence.
The category field must be one of: (${tagValues}).`;

    const apiModelIds = MODEL_FALLBACK_MAP[selectedModel] || [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
    ];
    const RETRYABLE_STATUS = new Set([429, 500, 503]);
    const MAX_RETRIES = 2;

    let lastErrorDetails = "";
    let attemptedFallback = false;

    for (let modelIdx = 0; modelIdx < apiModelIds.length; modelIdx++) {
      const apiModel = apiModelIds[modelIdx]!;
      const canThink = doesModelSupportThinking(apiModel);

      if (modelIdx > 0) {
        toast.info(t.fallbackModel(apiModel), { duration: 4000 });
        attemptedFallback = true;
      }

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          toast.info(t.retryingModel(apiModel), { duration: 3000 });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${cleanApiKey}`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ inlineData: { mimeType, data: base64Data } }, { text: promptText }],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                ...(extendedThinking && canThink
                  ? {
                      thinkingConfig: {
                        thinkingBudget: 2048,
                      },
                    }
                  : {}),
              },
            }),
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => null);
            const msg =
              errBody?.error?.message || `HTTP ${response.status} (${response.statusText})`;
            lastErrorDetails = msg;

            if (response.status === 401 || response.status === 403) {
              return {
                data: null,
                error: `[Google ${response.status}] ${msg}`,
              };
            }

            // If Pro model is busy/overloaded (429/503) or not found (404), switch to 3.8-flash immediately
            const isProBusy =
              apiModel.includes("pro") &&
              (response.status === 429 || response.status === 503 || response.status === 404);
            if (isProBusy) {
              toast.info(
                lang === "ar"
                  ? `سيرفرات ${apiModel} مشغولة حالياً لدى جوجل؛ جاري التحويل التلقائي فوراً إلى Gemini 3.8 Flash فائق الذكاء ⚡`
                  : `Model ${apiModel} is busy; automatically switching to Gemini 3.8 Flash ⚡`,
                { duration: 5000 },
              );
              break;
            }

            if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
              continue;
            }
            break;
          }

          const data = await response.json();
          const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawJsonText) {
            const parsedItems = parseJsonFromResponse(rawJsonText);
            if (parsedItems && Array.isArray(parsedItems)) {
              const formatted = parsedItems.map((item, idx) => {
                let trans = ocrOnly ? item.originalText : item.translatedText;
                let fromTM = false;

                // Check Translation Memory if in full mode
                if (!ocrOnly && item.originalText) {
                  const { match } = lookupTranslationMemory(
                    item.originalText,
                    config.targetLanguage,
                  );
                  if (match && match.translatedText) {
                    trans = match.translatedText;
                    fromTM = true;
                  } else if (trans && trans !== item.originalText) {
                    saveToTranslationMemory(
                      item.originalText,
                      trans,
                      config.targetLanguage,
                      item.category,
                    );
                  }
                }

                return {
                  ...item,
                  id: item.id || `item_${idx}_${Date.now()}`,
                  topPercent: item.topPercent ?? Math.min(95, Math.max(5, (idx + 1) * 15)),
                  translatedText: trans,
                  fromTM,
                };
              });

              const filtered = config.extractSFX
                ? formatted
                : formatted.filter((item) => {
                    const cat = (item.category || "").trim().toLowerCase();
                    return cat !== "sfx" && cat !== "sound" && cat !== "onomatopoeia";
                  });

              return { data: filtered };
            }
          }

          lastErrorDetails = "Empty or invalid response from model";
          break;
        } catch (err: any) {
          lastErrorDetails = err?.message || "Network fetch error";
          if (attempt < MAX_RETRIES) {
            continue;
          }
        }
      }
    }

    if (attemptedFallback) {
      return { data: null, error: t.allModelsOverloaded };
    }
    return { data: null, error: lastErrorDetails || "Failed to connect to Google Gemini" };
  };

  const handleReTranslateBubble = async (item: ExtractedText) => {
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      return;
    }
    if (!item.originalText?.trim()) {
      toast.error(lang === "ar" ? "النص الأصلي فارغ" : "Original text is empty");
      return;
    }

    setRetranslatingBubbleId(item.id);
    try {
      const targetLangName = config.targetLanguage === "ar" ? "Arabic (العربية)" : "English";
      const glossaryPrompt = formatGlossaryForPrompt(glossary, config.targetLanguage);

      const bubblePrompt = `You are an expert manga and webtoon translator.
Translate the following dialogue/bubble text accurately and naturally into ${targetLangName}.
Context category: "${item.category}".
Original text:
"""${item.originalText}"""

${glossaryPrompt}

Output ONLY the translated text directly without any quotes, annotations, or explanations.`;

      const apiModelIds = MODEL_FALLBACK_MAP[selectedModel] || [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.6-flash",
      ];
      let newTranslation = "";
      let succeeded = false;

      for (const apiModel of apiModelIds) {
        const canThink = doesModelSupportThinking(apiModel);
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${cleanApiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: bubblePrompt }] }],
              generationConfig: {
                temperature: 0.2,
                ...(extendedThinking && canThink
                  ? { thinkingConfig: { thinkingBudget: 2048 } }
                  : {}),
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (translated) {
              newTranslation = translated;
              succeeded = true;
              break;
            }
          }
        } catch (e) {
          console.warn(`Bubble translation failed on ${apiModel}`, e);
        }
      }

      if (succeeded && newTranslation) {
        updateItem(item.id, "translatedText", newTranslation);
        saveToTranslationMemory(
          item.originalText,
          newTranslation,
          config.targetLanguage,
          item.category,
        );
        toast.success(t.reTranslateSuccess);
      } else {
        toast.error(lang === "ar" ? "تعذرت إعادة ترجمة الفقرة" : "Failed to re-translate bubble");
      }
    } catch (err: any) {
      toast.error(err.message || "Error during bubble re-translation");
    } finally {
      setRetranslatingBubbleId(null);
    }
  };

  const handleAnalyzeCurrent = async (ocrOnly = false): Promise<void> => {
    if (!activeImage) {
      toast.error(t.selectImageFirst);
      return;
    }
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      setShowKeyHelpModal(true);
      return;
    }

    setIsAnalyzing(true);
    setCurrentProcessingMsg(t.analyzingWith(getEffectiveModel()));

    const { data: res, error } = await processGeminiRequest(activeImage, ocrOnly, reAnalysisNote);
    if (res && res.length > 0) {
      setResultsMap((prev) => ({ ...prev, [activeImage.id]: res }));
      toast.success(t.successExtract);
      setView("results");
      if (activeImage) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            supabase
              .from("user_history")
              .insert({
                user_id: session.user.id,
                image_name: activeImage.name,
                extracted_count: res.length,
              })
              .then(({ error: histError }) => {
                if (histError) {
                  console.error("Failed to save history:", histError);
                  toast.error(t.historySaveError, { duration: 4000 });
                }
              });
          }
        });
      }
    } else {
      const errorMsg = error || t.checkApiKey;
      toast.error(`❌ ${errorMsg}`, { duration: 8000 });
      if (cleanApiKey.startsWith("AQ.")) {
        setShowKeyHelpModal(true);
      }
    }
    setIsAnalyzing(false);
  };

  const handleAnalyzeSelected = async (ocrOnly = false): Promise<void> => {
    const targetImages = images.filter((img) => selectedImageIds.includes(img.id));
    if (targetImages.length === 0) {
      toast.error(t.noPagesSelected);
      return;
    }
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      setShowKeyHelpModal(true);
      return;
    }

    setIsAnalyzing(true);
    const newMap = { ...resultsMap };
    let successCount = 0;
    let lastError = "";

    for (let i = 0; i < targetImages.length; i++) {
      const img = targetImages[i]!;
      const pageIndex = images.findIndex((x) => x.id === img.id);
      const pageNum = getDisplayPageNumber(img, pageIndex >= 0 ? pageIndex : i);

      setCurrentProcessingMsg(t.reAnalyzingPage(i + 1, targetImages.length, pageNum));

      const { data: res, error } = await processGeminiRequest(img, ocrOnly, reAnalysisNote);
      if (res && res.length > 0) {
        newMap[img.id] = res;
        successCount++;

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            supabase
              .from("user_history")
              .insert({
                user_id: session.user.id,
                image_name: img.name,
                extracted_count: res.length,
              })
              .then(({ error: histError }) => {
                if (histError) console.error("Failed to save history:", histError);
              });
          }
        });
      } else if (error) {
        lastError = error;
        toast.error(`❌ #${pageNum} (${img.name}): ${error}`, { duration: 5000 });
      }
    }

    setResultsMap(newMap);
    setIsAnalyzing(false);

    if (successCount > 0) {
      toast.success(t.reAnalyzeSelectedSuccess(successCount));
      setView("results");
    } else if (lastError) {
      toast.error(`❌ ${lastError || t.extractionFailed}`, { duration: 8000 });
      if (cleanApiKey.startsWith("AQ.")) {
        setShowKeyHelpModal(true);
      }
    }
  };

  const handleExportPhotoshopJsx = (scope: "current" | "all" = "all") => {
    if (!isVip) {
      toast.info(
        lang === "ar"
          ? "تصدير سكريبت الفوتوشوب الآلي (.jsx) ميزة حصرية لأعضاء VIP 👑 لمساعدة المحرر والمبيض (Typer) على إنشاء طبقات النصوص فوراً في Photoshop!"
          : "Photoshop JSX Script Export is a VIP exclusive feature 👑",
        {
          action: {
            label: lang === "ar" ? "ترقية VIP 👑" : "Upgrade to VIP",
            onClick: () => setShowVipPerksModal(true),
          },
        },
      );
      return;
    }

    const targetImages = scope === "current" && activeImage ? [activeImage] : images;
    if (targetImages.length === 0) {
      toast.error(
        lang === "ar" ? "لا توجد صور لتصدير سكريبت لها" : "No images to export script for",
      );
      return;
    }

    const pagesData = targetImages.map((img) => ({
      name: img.name,
      bubbles: resultsMap[img.id] || [],
    }));

    const fileName =
      scope === "current" && activeImage
        ? `${activeImage.name.replace(/\.[^/.]+$/, "")}_photoshop.jsx`
        : "chapter_photoshop_script.jsx";

    downloadPhotoshopJsx(pagesData, fileName, currentUserEmail || "مترجم المانهوا");
    toast.success(
      lang === "ar"
        ? "تم تحميل سكريبت الفوتوشوب (.jsx) بنجاح! يمكن للمبيض تشغيله من: File > Scripts > Browse في Photoshop 🎨"
        : "Photoshop JSX Script downloaded successfully! Run from File > Scripts > Browse in Photoshop 🎨",
    );
  };

  const handleAnalyzeAll = async (ocrOnly = false): Promise<void> => {
    if (images.length === 0) {
      toast.error(t.selectImageFirst);
      return;
    }
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      setShowKeyHelpModal(true);
      return;
    }

    // Inform free users about Turbo batch processing for full chapters
    if (!isVip && images.length > 8) {
      toast.info(
        lang === "ar"
          ? "💡 تلميح: أعضاء VIP 👑 يتمتعون بوضع التوربو السريع (Turbo 3x) لمعالجة فصول كاملة (30-70 صفحة) بالتوازي!"
          : "💡 Tip: VIP members enjoy 3x Turbo parallel batch processing for entire chapters!",
        { duration: 6000 },
      );
    }

    setIsAnalyzing(true);
    const newMap = { ...resultsMap };
    let successCount = 0;
    let lastError = "";

    const isTurbo = isVip;
    const CHUNK_SIZE = isTurbo ? 3 : 1;

    for (let i = 0; i < images.length; i += CHUNK_SIZE) {
      const chunk = images.slice(i, i + CHUNK_SIZE);
      const startIdx = i + 1;
      const endIdx = Math.min(i + CHUNK_SIZE, images.length);

      setCurrentProcessingMsg(
        isTurbo
          ? lang === "ar"
            ? `⚡ وضع التوربو VIP: معالجة الصفحات (${startIdx}-${endIdx} من ${images.length}) بالتوازي...`
            : `⚡ VIP Turbo: Processing pages ${startIdx}-${endIdx} of ${images.length} in parallel...`
          : t.processingImage(startIdx, images.length),
      );

      const chunkResults = await Promise.all(
        chunk.map(async (img) => {
          const res = await processGeminiRequest(img, ocrOnly);
          return { img, res };
        }),
      );

      let chunkFailed = false;
      for (const { img, res } of chunkResults) {
        if (res.data && res.data.length > 0) {
          newMap[img.id] = res.data;
          successCount++;
        } else if (res.error) {
          lastError = res.error;
          chunkFailed = true;
        }
      }

      // If in non-turbo mode and an error happened, stop to allow user review
      if (!isTurbo && chunkFailed) {
        break;
      }
    }

    setResultsMap(newMap);
    setIsAnalyzing(false);

    if (successCount > 0) {
      toast.success(
        isTurbo
          ? lang === "ar"
            ? `⚡ تم إكمال معالجة ${successCount} صفحة بنجاح بوضع التوربو السريع 👑`
            : `⚡ Completed ${successCount} pages with VIP Turbo mode 👑`
          : t.processedImages(successCount),
      );
      setView("results");
    } else {
      toast.error(`❌ ${lastError || t.extractionFailed}`, { duration: 8000 });
      if (cleanApiKey.startsWith("AQ.")) {
        setShowKeyHelpModal(true);
      }
    }
  };

  const handleExportText = (
    scope: "current" | "all",
    textType: "original" | "translated",
  ): void => {
    const targetImages = scope === "current" ? (activeImage ? [activeImage] : []) : images;
    if (targetImages.length === 0) return;

    const fullOutput = buildScriptText({
      images,
      resultsMap,
      textType,
      tags,
      tagsEnabled,
      scope,
      currentImageId: activeImage?.id,
      startPageNumber,
      useFilenamePageNumber,
      extractSFX: config.extractSFX,
    });

    if (!fullOutput.trim()) {
      toast.error(t.noItemsToExport);
      return;
    }

    const blob = new Blob([fullOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const currentPageDisplay = activeImage
      ? getDisplayPageNumber(activeImage, activeImageIndex)
      : activeImageIndex + 1;
    const fileName =
      textType === "original"
        ? scope === "current"
          ? `page_${currentPageDisplay}_ocr_original_script.txt`
          : `full_ocr_original_script.txt`
        : scope === "current"
          ? `page_${currentPageDisplay}_translated_script.txt`
          : `full_translated_script.txt`;

    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t.exported(fileName));
  };

  const handleExportDocx = async (
    scope: "current" | "all",
    textType: "original" | "translated" = "translated",
  ): Promise<void> => {
    const targetImages = scope === "current" ? (activeImage ? [activeImage] : []) : images;
    if (targetImages.length === 0) return;

    const targetPages: MangaPageItem[] = targetImages.map((img) => ({
      id: img.id,
      fileName: img.name,
      previewUrl: img.url,
      status: "completed",
      items: (resultsMap[img.id] || []).map((item) => ({
        id: item.id,
        originalText: item.originalText,
        translatedText: item.translatedText,
        category: item.category,
      })),
    }));

    const currentPageDisplay = activeImage
      ? getDisplayPageNumber(activeImage, activeImageIndex)
      : activeImageIndex + 1;
    const fileName =
      textType === "original"
        ? scope === "current"
          ? `page_${currentPageDisplay}_ocr_original_script.docx`
          : `full_ocr_original_script.docx`
        : scope === "current"
          ? `page_${currentPageDisplay}_translated_script.docx`
          : `full_translated_script.docx`;

    try {
      await exportChapterToDocx(
        targetPages,
        config.targetLanguage === "ar",
        {
          startPageNumber,
          useFilenamePageNumber,
          tags,
          tagsEnabled,
          textType,
          extractSFX: config.extractSFX,
        },
        fileName,
      );
      toast.success(t.exported(fileName));
    } catch (err) {
      toast.error("فشل في إنشاء ملف Word (DOCX)");
    }
  };

  const updateItem = (id: string, field: keyof ExtractedText, value: string) => {
    if (!activeImage) return;
    setResultsMap((prev) => {
      const list = prev[activeImage.id] || [];
      const updated = list.map((item) => (item.id === id ? { ...item, [field]: value } : item));
      return { ...prev, [activeImage.id]: updated };
    });
  };

  return (
    <div
      className={`min-h-screen bg-background text-foreground p-4 sm:p-8 w-full max-w-[1550px] mx-auto ${lang === "ar" ? "dir-rtl" : "dir-ltr"}`}
    >
      {/* Header */}
      <header className="mb-6 flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-border pb-4 gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <img
            id="app-header-logo"
            src="/logo.png"
            alt={`${BRAND_NAME} Logo`}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl object-cover shadow-md shadow-orange-500/10 border-2 border-orange-200 dark:border-orange-900/60 shrink-0 bg-white p-0.5"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
              {BRAND_NAME}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          {/* زر القائمة الجانبية الموحدة (الأدوات والمشاريع) - ☰ Hamburger Menu */}
          <NavigationSidebar
            onNewProject={handleClearAllImages}
            onOpenGlossary={() => setShowGlossaryModal(true)}
            onOpenTM={() => setShowTMModal(true)}
            onOpenTagSettings={() => setShowTagSettingsModal(true)}
            onOpenHowToUse={() => setShowHowToUseModal(true)}
            glossaryCount={glossary.length}
            extendedThinking={extendedThinking}
            onExtendedThinkingChange={setExtendedThinking}
            brandName={BRAND_NAME}
            tagsEnabled={tagsEnabled}
            onToggleTagsEnabled={setTagsEnabled}
            onManualSync={handleManualCloudSync}
            isSyncing={isSyncingCloud}
          />

          {/* زر تسجيل الدخول والبروفايل */}
          <AuthModal />

          {/* زر المزامنة السحابية السريع والمباشر في الشريط العلوي */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!currentUserEmail) {
                window.dispatchEvent(new CustomEvent("open_auth_modal"));
                toast.info(
                  lang === "ar"
                    ? "يرجى تسجيل الدخول أولاً لحفظ واسترجاع إعداداتك ومشاريعك سحابياً ☁️"
                    : "Please sign in first to sync settings to the cloud ☁️",
                );
              } else {
                handleManualCloudSync();
              }
            }}
            disabled={isSyncingCloud}
            className={`h-9 px-2.5 gap-1.5 text-xs font-bold rounded-xl border transition-all ${
              currentUserEmail
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-xs"
                : "border-border/60 hover:bg-muted text-muted-foreground"
            }`}
            title={
              currentUserEmail
                ? lang === "ar"
                  ? `مزامنة الإعدادات السحابية الآن (${currentUserEmail})`
                  : `Sync with cloud now (${currentUserEmail})`
                : lang === "ar"
                  ? "تسجيل الدخول لتفعيل المزامنة السحابية"
                  : "Sign in to enable cloud sync"
            }
          >
            {isSyncingCloud ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            ) : (
              <Cloud
                className={`w-3.5 h-3.5 ${currentUserEmail ? "text-emerald-500" : "text-muted-foreground"}`}
              />
            )}
            <span className="hidden sm:inline">
              {isSyncingCloud
                ? lang === "ar"
                  ? "جاري المزامنة..."
                  : "Syncing..."
                : lang === "ar"
                  ? "مزامنة سحابية"
                  : "Cloud Sync"}
            </span>
          </Button>

          {/* اختيار النموذج (Model Selector) */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2 h-9">
            <Cpu className="w-4 h-4 text-orange-500 shrink-0" />
            <Select
              value={selectedModel}
              onValueChange={(val) => {
                const targetModel = availableModels.find((m) => m.id === val);
                if (targetModel?.isVipOnly && !isVip) {
                  toast.info(
                    lang === "ar"
                      ? `نموذج (${targetModel.label}) متاح حصرياً لأعضاء باقة VIP 👑 للحصول على أقصى دقة ترجمة وفهم سياقي`
                      : `${targetModel.label} is exclusive to VIP members 👑`,
                    {
                      action: {
                        label: lang === "ar" ? "ترقية VIP 👑" : "Upgrade",
                        onClick: () => setShowVipPerksModal(true),
                      },
                    },
                  );
                  return;
                }
                setSelectedModel(val);
              }}
            >
              <SelectTrigger className="h-7 text-xs font-bold border-0 bg-transparent focus:ring-0 w-48 sm:w-52">
                <SelectValue placeholder={t.selectModel} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs font-medium">
                    <div className="flex items-center justify-between gap-2.5 w-full">
                      <span className="flex items-center gap-1">
                        {m.badge === "vip" && (
                          <Crown className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
                        )}
                        {m.label}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          m.badge === "vip"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black"
                            : m.badge === "stable"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {m.badge === "vip"
                          ? "VIP 👑"
                          : m.badge === "stable"
                            ? t.modelStable
                            : t.modelPreview}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </Button>

          <Button
            variant="outline"
            className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl"
            onClick={toggleLang}
          >
            <Languages className="w-4 h-4 text-orange-500" />
            {t.switchLangLabel}
          </Button>

          {/* خانة الـ API مع زر فحص مباشر */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl pr-1 overflow-hidden focus-within:ring-1 ring-orange-500">
            <Input
              type="password"
              placeholder={t.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              className="h-9 text-xs w-full sm:w-44 dir-ltr border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestApiKey}
              disabled={isTestingKey}
              title={t.testApiKey}
              className="h-7 px-2 text-[11px] text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-500/10 rounded-lg gap-1"
            >
              {isTestingKey ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              <span>{t.test}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKeyHelpModal(true)}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-orange-500"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* نافذة المساعدة للحصول على مفتاح Gemini الصحيح */}
      <Dialog open={showKeyHelpModal} onOpenChange={setShowKeyHelpModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-orange-600">
              <KeyRound className="w-5 h-5" />
              <span>{t.keyHelpTitle}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground mt-2">
            <p>{t.keyHelpIntro}</p>
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2 text-xs text-foreground">
              <p>
                ✅ <strong>{t.keyHelpValid}</strong> {t.keyHelpValidDesc}{" "}
                <code className="text-orange-500 font-mono font-bold">AIzaSy...</code>
              </p>
              <p>
                ❌ <strong>{t.keyHelpInvalid}</strong>{" "}
                <code className="font-mono text-red-400">AQ...</code> {t.keyHelpInvalidDesc}
              </p>
            </div>
            <ol className="list-decimal list-inside space-y-2 font-medium text-foreground text-xs leading-relaxed">
              <li>{t.keyHelpS1}</li>
              <li>{t.keyHelpS2}</li>
              <li>{t.keyHelpS3}</li>
              <li>{t.keyHelpS4}</li>
            </ol>
            <div className="pt-2 flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Button
                  asChild
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
                >
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.keyHelpOpen} <ExternalLink className="w-4 h-4 mr-2 ml-2" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="text-xs h-10 rounded-xl"
                  onClick={() => setShowKeyHelpModal(false)}
                >
                  {t.close}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/60 text-xs border border-border">
                <span className="text-muted-foreground text-[11px] font-mono truncate flex-1 dir-ltr text-left select-all">
                  https://aistudio.google.com/app/apikey
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 rounded-lg gap-1 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText("https://aistudio.google.com/app/apikey");
                    toast.success(t.copiedLink);
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyLink}</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة إعدادات العلامات المستقلة */}
      <Dialog open={showTagSettingsModal} onOpenChange={setShowTagSettingsModal}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>{t.tagSettings}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTags(DEFAULT_TAGS)}
                className="text-xs text-muted-foreground hover:text-orange-500 gap-1 h-8 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {t.resetDefaultTags}
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* سويتش تفعيل / تعطيل العلامات في الترجمة */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card shadow-xs">
              <div className="space-y-0.5 pe-4">
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>
                    {lang === "ar"
                      ? "تفعيل نظام العلامات والوسوم في الترجمة"
                      : "Enable Tag Formatting in Translation"}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      tagsEnabled
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tagsEnabled
                      ? lang === "ar"
                        ? "مفعّل"
                        : "Active"
                      : lang === "ar"
                        ? "معطّل (ترجمة نظيفة)"
                        : "Disabled (Clean Text)"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? "عند إيقاف هذا الخيار، ستظهر وتُصدّر الترجمة نظيفة تماماً بدون أي علامات أو تصنيفات للمبيضين."
                    : "When turned off, translations are extracted and exported cleanly without any tag prefixes or labels."}
                </p>
              </div>
              <Switch
                checked={tagsEnabled}
                onCheckedChange={setTagsEnabled}
                aria-label="Toggle Tags"
              />
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
              {t.tagHint}
            </p>

            {/* شريط أدوات استيراد وتصدير ملف TXT */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/50 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <input
                  ref={tagFileInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleImportTagsFile}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => tagFileInputRef.current?.click()}
                  className="h-8 gap-1.5 text-xs font-bold border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {t.uploadTagsTxt}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTagsFile}
                  className="h-8 gap-1.5 text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t.exportTagsTxt}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTagFormatHelp(!showTagFormatHelp)}
                className="h-8 text-xs text-muted-foreground hover:text-orange-500 gap-1 px-2"
              >
                <Info className="w-3.5 h-3.5" />
                {t.tagTxtTemplate}
              </Button>
            </div>

            {/* بطاقة توضيحية لنموذج ملف الـ TXT */}
            {showTagFormatHelp && (
              <div className="p-3 bg-muted/80 rounded-xl border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {lang === "ar" ? "صيغة ملف TXT المدعومة:" : "Supported TXT Format:"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] text-orange-600"
                    onClick={() => {
                      const sample = `"": حوار\n(): أفكار\n<>: صراخ\n[]: نظام\n**: هاتف\nNA: راوي\nsfx: مؤثر صوتي\nST: همس`;
                      navigator.clipboard.writeText(sample);
                      toast.success(t.copied);
                    }}
                  >
                    <Copy className="w-3 h-3 me-1" />
                    {t.copyBlock}
                  </Button>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {lang === "ar"
                    ? "اكتب كل علامة في سطر مع وضع نقطتين (:) ثم الشرح أو التصنيف، وسيتم تصنيفها وتحديثها تلقائياً:"
                    : "Write each tag on a line with a colon (:) and its description. Tags will be auto-classified:"}
                </p>
                <pre className="bg-background/90 p-2.5 rounded-lg font-mono text-[11px] dir-ltr text-foreground overflow-x-auto border border-border/60">
                  {`"": حوار
(): أفكار
<>: صراخ
[]: نظام
**: هاتف
NA: راوي
sfx: مؤثر صوتي
ST: همس`}
                </pre>
              </div>
            )}

            {/* قائمة العلامات مع التصنيف */}
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {tags.map((tag, i) => (
                <div
                  key={tag.value || i}
                  className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg text-xs"
                >
                  <div className="flex flex-col w-28 shrink-0">
                    <span className="font-bold truncate" title={getTagLabel(tag, lang)}>
                      {getTagLabel(tag, lang)}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono truncate">
                      {tag.value}
                    </span>
                  </div>
                  <Input
                    value={tag.prefix}
                    onChange={(e) => {
                      const updated = [...tags];
                      updated[i]!.prefix = e.target.value;
                      setTags(updated);
                    }}
                    className="h-7 text-xs w-20 dir-ltr font-mono"
                    placeholder="Prefix"
                    title="Prefix"
                  />
                  <Input
                    value={tag.suffix}
                    onChange={(e) => {
                      const updated = [...tags];
                      updated[i]!.suffix = e.target.value;
                      setTags(updated);
                    }}
                    className="h-7 text-xs w-16 dir-ltr font-mono"
                    placeholder="Suffix"
                    title="Suffix"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTag(i)}
                    className="h-7 w-7 text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <Input
                placeholder={t.tagName}
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Input
                  placeholder={t.tagPrefix}
                  value={newTagPrefix}
                  onChange={(e) => setNewTagPrefix(e.target.value)}
                  className="h-8 text-xs dir-ltr font-mono"
                />
                <Input
                  placeholder={t.tagSuffix}
                  value={newTagSuffix}
                  onChange={(e) => setNewTagSuffix(e.target.value)}
                  className="h-8 text-xs dir-ltr font-mono"
                />
              </div>
              <Button
                onClick={handleAddCustomTag}
                className="w-full h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 me-1" /> {t.add}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة كيفية الاستخدام (Tutorial) المستقلة */}
      <Dialog open={showHowToUseModal} onOpenChange={setShowHowToUseModal}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-orange-600">{t.howToTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>{t.howToIntro}</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>{t.howToStep1a}</strong> {t.howToStep1b}
              </li>
              <li>
                <strong>{t.howToStep2a}</strong> {t.howToStep2b}
              </li>
              <li>
                <strong>{t.howToStep3a}</strong> {t.howToStep3b}
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة إعدادات ترقيم الصفحات */}
      <Dialog open={showPageNumberModal} onOpenChange={setShowPageNumberModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-orange-600">
              <Hash className="w-5 h-5" />
              <span>{t.pageNumberingSettings}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border">
              <Label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <span>{t.startPageNumberLabel}</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={startPageNumber}
                  onChange={(e) =>
                    setStartPageNumber(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="h-8 w-28 text-xs font-mono font-bold bg-background text-foreground"
                />
                <span className="text-[11px] text-muted-foreground">{t.startPageNumberDesc}</span>
              </div>
            </div>

            <div className="space-y-1 bg-muted/40 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use-filename-num"
                  checked={useFilenamePageNumber}
                  onCheckedChange={(c) => setUseFilenamePageNumber(!!c)}
                />
                <Label htmlFor="use-filename-num" className="font-bold cursor-pointer text-xs">
                  {t.useFilenameNumberLabel}
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 pr-6 pl-6">
                {t.useFilenameNumberDesc}
              </p>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 rounded-lg"
                  onClick={() => {
                    const firstNum = extractPageNumber(images[0]?.name || "");
                    if (firstNum !== null && firstNum > 0) {
                      setStartPageNumber(firstNum);
                      toast.success(`تم ضبط البداية على صفحة ${firstNum}`);
                    } else {
                      toast.info("اسم أول ملف لا يحتوي على رقم صفحة واضح");
                    }
                  }}
                >
                  التقاط رقم أول صورة ({images[0]?.name})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 rounded-lg text-muted-foreground"
                  onClick={() => {
                    setStartPageNumber(1);
                    setUseFilenamePageNumber(true);
                  }}
                >
                  استعادة الافتراضي (1)
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl"
              onClick={() => setShowPageNumberModal(false)}
            >
              {t.close}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* شريط تبويبات مساحات العمل والمشاريع المتعددة */}
      <WorkspaceTabBar
        workspaces={workspaces}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCreateTab={handleCreateTab}
        onCloseTab={handleCloseTab}
        onRenameTab={handleRenameTab}
        onDuplicateTab={handleDuplicateTab}
        isAnalyzing={isAnalyzing}
      />

      {/* Bar for images */}
      {images.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="p-3 bg-card border border-border rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
              <Images className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                {t.page} ({images.length}/{MAX_IMAGES_LIMIT}):
              </span>
              <div
                className="flex gap-1.5 overflow-x-auto py-1"
                onDragEnd={() => setDraggedImageIndex(null)}
              >
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => setDraggedImageIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedImageIndex !== null) handleReorderImages(draggedImageIndex, idx);
                      setDraggedImageIndex(null);
                    }}
                    className={`relative flex items-center gap-1.5 shrink-0 rounded-lg px-2 py-1 transition-all ${
                      activeImageIndex === idx
                        ? "bg-orange-600 text-white shadow-md"
                        : selectedImageIds.includes(img.id)
                          ? "bg-orange-500/15 border border-orange-500/60 text-foreground shadow-xs"
                          : "bg-muted hover:bg-muted/80 text-foreground"
                    } ${draggedImageIndex === idx ? "opacity-50" : ""}`}
                    title="اسحب الصفحة لتغيير ترتيبها"
                  >
                    <GripVertical className="w-3 h-3 cursor-grab opacity-60" />
                    <input
                      type="checkbox"
                      checked={selectedImageIds.includes(img.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectImage(img.id);
                      }}
                      className="w-3.5 h-3.5 rounded border-orange-500 accent-orange-600 cursor-pointer shrink-0"
                      title={
                        lang === "ar"
                          ? "تحديد الصفحة لإعادة التحليل"
                          : "Select page for re-analysis"
                      }
                    />
                    <button
                      onClick={() => setActiveImageIndex(idx)}
                      className="flex items-center gap-1.5 text-xs font-bold"
                    >
                      <span>#{getDisplayPageNumber(img, idx)}</span>
                      {resultsMap[img.id] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      )}
                    </button>
                    {editingImageId === img.id ? (
                      <>
                        <Input
                          value={editingImageName}
                          onChange={(e) => setEditingImageName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveImageName();
                          }}
                          className="h-6 w-28 bg-background text-foreground text-[10px] px-1"
                          autoFocus
                        />
                        <button onClick={saveImageName} title="حفظ اسم الصفحة">
                          <Check className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="max-w-24 truncate text-[10px] opacity-80">{img.name}</span>
                        <button onClick={() => startRenameImage(img)} title="إعادة تسمية الصفحة">
                          <Pencil className="w-3 h-3 opacity-70 hover:opacity-100" />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleRemoveImage(idx)} title="حذف الصفحة">
                      <Trash2 className="w-3 h-3 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={
                  selectedImageIds.length === images.length && images.length > 0
                    ? handleDeselectAllImages
                    : handleSelectAllImages
                }
                title={
                  selectedImageIds.length === images.length && images.length > 0
                    ? t.deselectAllPages
                    : t.selectAllPages
                }
                className="text-xs font-bold gap-1 rounded-xl h-8 border-border hover:border-orange-500/40 shadow-sm"
              >
                <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  {selectedImageIds.length === images.length && images.length > 0
                    ? t.deselectAllPages
                    : t.selectAllPages}
                </span>
                {selectedImageIds.length > 0 && (
                  <span className="bg-orange-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.2">
                    {selectedImageIds.length}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDriveModal(true)}
                title={
                  lang === "ar"
                    ? "استيراد صور إضافية من Google Drive أو رابط"
                    : "Import from Google Drive"
                }
                className="text-xs font-bold gap-1 rounded-xl h-8 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shadow-sm"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {lang === "ar" ? "إضافة من درايف" : "Drive"}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSortImagesNumerically}
                title={t.sortPagesNumerically}
                className="text-xs font-bold gap-1 rounded-xl h-8 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shadow-sm"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{t.sortPagesNumerically}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPageNumberModal(true)}
                title={t.pageNumberingSettings}
                className="text-xs font-bold gap-1 rounded-xl h-8 border-border hover:border-orange-500/40"
              >
                <Hash className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  {useFilenamePageNumber ? `${t.page}: تلقائي` : `${t.page}: ${startPageNumber}+`}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllImages}
                className="text-xs text-red-500 font-bold h-8 rounded-xl hover:bg-red-500/10"
              >
                {t.clearAll}
              </Button>
            </div>
          </div>

          {/* Ad Space directly under the pages bar as requested */}
          <AdSlot id="ad-under-pages-toolbar" format="leaderboard" />
        </div>
      )}

      {/* Main View Switcher */}
      {view === "upload" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <UploadZone
                imagePreview={activeImage?.url || null}
                fileName={activeImage?.name || null}
                config={config}
                isAnalyzing={isAnalyzing}
                onImageSelected={handleImageSelected}
                onMultipleImagesSelected={handleMultipleImagesSelected}
                onClearImage={handleClearAllImages}
                onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
                onAnalyze={() => handleAnalyzeCurrent(false)}
              />

              <div className="flex flex-col items-center justify-center mt-2">
                <Label
                  htmlFor="ref-upload"
                  className="cursor-pointer flex items-center gap-2 text-xs text-muted-foreground hover:text-orange-500 transition-colors bg-muted/30 px-4 py-2 rounded-xl border border-dashed border-border/60"
                >
                  <Paperclip className="w-4 h-4" />
                  {referenceFileName ? (
                    <span className="font-bold text-orange-500">
                      {t.referenceUploaded} {referenceFileName}
                    </span>
                  ) : (
                    <span>{t.uploadReference}</span>
                  )}
                </Label>
                <input
                  id="ref-upload"
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={handleReferenceUpload}
                  disabled={isAnalyzing}
                />
              </div>

              {images.length > 0 && (
                <div className="flex flex-col items-center justify-center gap-4 pt-2 min-h-[60px]">
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-3 w-full max-w-md bg-card p-4 rounded-2xl border border-orange-500/30 shadow-lg animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                        <span className="text-sm font-bold text-foreground">
                          {currentProcessingMsg}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div className="bg-orange-500 h-full animate-[pulse_2s_ease-in-out_infinite] w-full origin-left scale-x-100"></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        {t.analysisWaitNote}
                      </p>
                      <AdSlot id="ad-processing-loader" format="compact" className="w-full mt-1" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-3 w-full animate-in fade-in zoom-in">
                      <Button
                        onClick={() => handleAnalyzeCurrent(false)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md"
                      >
                        <Sparkles className="w-4 h-4" /> {t.analyzeCurrent}
                      </Button>
                      <Button
                        onClick={() => handleAnalyzeCurrent(true)}
                        variant="outline"
                        className="border-orange-500/40 text-orange-600 dark:text-orange-400 font-bold h-11 px-6 rounded-xl gap-2"
                      >
                        <FileText className="w-4 h-4" /> {t.extractOcrOnly}
                      </Button>
                      <Button
                        onClick={() => handleAnalyzeAll(false)}
                        className={`${
                          isVip
                            ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800"
                            : "bg-zinc-800 hover:bg-zinc-700"
                        } text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md`}
                      >
                        <Play className="w-4 h-4 text-amber-300" />
                        <span>
                          {t.analyzeAll} ({images.length})
                        </span>
                        {isVip && (
                          <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-xs">
                            ⚡ توربو 3x
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <SidebarInfoCards />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3 shadow-sm">
            <Button
              variant="outline"
              onClick={() => setView("upload")}
              className="gap-2 text-xs font-bold rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" /> {t.backToUpload}
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGlobalFindReplaceModal(true)}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shadow-xs"
                title={`${t.globalFindReplace} (Ctrl+H / Ctrl+F)`}
              >
                <Replace className="w-3.5 h-3.5" />
                <span>{t.globalFindReplace}</span>
                <kbd className="hidden md:inline-block text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/80 font-mono text-muted-foreground">
                  Ctrl+H
                </kbd>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProofreaderModal(true)}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shadow-xs"
                title={
                  lang === "ar"
                    ? "التدقيق اللغوي والأدبي بالذكاء الاصطناعي (VIP)"
                    : "AI Literary Proofreader (VIP)"
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === "ar" ? "التدقيق الأدبي" : "Proofreader"}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black">
                  VIP 👑
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGoogleDocsModal(true)}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 shadow-xs"
                title={lang === "ar" ? "مستند Google Docs ورابط سحابي" : "Google Docs & Cloud Link"}
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Google Docs</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                  VIP 👑
                </span>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60">
              <div className="flex items-center gap-1.5 px-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={t.findPlaceholder}
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="h-7 text-xs w-28 bg-background"
                />
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <Replace className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder={t.replacePlaceholder}
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="h-7 text-xs w-28 bg-background"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleFindAndReplace("current")}
                className="h-7 text-[11px] font-bold px-2 rounded-lg"
              >
                {t.replaceCurrentPage}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleFindAndReplace("all")}
                className="h-7 text-[11px] font-bold px-2 rounded-lg"
              >
                {t.replaceAllPages}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPageNumberModal(true)}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl border-border hover:border-orange-500/40"
                title={t.pageNumberingSettings}
              >
                <Hash className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  {t.pageNumberingSettings} (
                  {useFilenamePageNumber
                    ? `${t.page}: ${activeImage ? getDisplayPageNumber(activeImage, activeImageIndex) : startPageNumber}`
                    : `${t.page}: ${startPageNumber}+`}
                  )
                </span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-orange-500/40 text-orange-600 dark:text-orange-400 gap-1.5 text-xs font-bold rounded-xl h-8"
                  >
                    <FileDown className="w-4 h-4" /> {t.exportOriginal}{" "}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleExportText("current", "original")}
                    className="text-xs cursor-pointer font-medium"
                  >
                    {t.exportCurrentPage} (TXT)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportText("all", "original")}
                    className="text-xs cursor-pointer font-medium"
                  >
                    {t.exportAllPages} (TXT)
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-border/60 my-1"></div>
                  <DropdownMenuItem
                    onClick={() => handleExportDocx("current", "original")}
                    className="text-xs cursor-pointer font-medium text-orange-600 dark:text-orange-400"
                  >
                    {t.exportDocxCurrent}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportDocx("all", "original")}
                    className="text-xs cursor-pointer font-medium text-orange-600 dark:text-orange-400"
                  >
                    {t.exportDocxAll}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs font-bold rounded-xl shadow-sm h-8">
                    <Download className="w-4 h-4" /> {t.exportTranslated}{" "}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem
                    onClick={() => handleExportText("current", "translated")}
                    className="text-xs cursor-pointer font-medium"
                  >
                    {t.exportCurrentPage} (TXT)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportText("all", "translated")}
                    className="text-xs cursor-pointer font-medium"
                  >
                    {t.exportAllPages} (TXT)
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-border/60 my-1"></div>
                  <DropdownMenuItem
                    onClick={() => handleExportDocx("current")}
                    className="text-xs cursor-pointer font-medium text-orange-600 dark:text-orange-400"
                  >
                    {t.exportDocxCurrent}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExportDocx("all")}
                    className="text-xs cursor-pointer font-medium text-orange-600 dark:text-orange-400"
                  >
                    {t.exportDocxAll}
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-border/60 my-1"></div>
                  <DropdownMenuItem
                    onClick={() => setShowGoogleDocsModal(true)}
                    className="text-xs cursor-pointer font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>
                        {lang === "ar"
                          ? "تصدير Google Docs ومشاركة الرابط"
                          : "Google Docs & Direct Link"}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold">
                      VIP 👑
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* صندوق اقتراحات وإعادة التحليل الموسّع مع دعم تحديد صفحات معينة */}
          <div className="bg-card p-4 rounded-2xl border border-orange-500/30 shadow-sm space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                <span>{t.reAnalysisLabel}</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? "اكتب تفاصيل أو ملاحظات عن الفقرات المفقودة لتوجيه النموذج بدقة (اختياري)"
                    : "Specify notes about missed text bubbles to guide Gemini accurately (optional)"}
                </span>
                {reAnalysisNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReAnalysisNote("")}
                    className="h-6 text-[11px] text-muted-foreground hover:text-red-500 px-2"
                  >
                    {lang === "ar" ? "مسح الملاحظة" : "Clear note"}
                  </Button>
                )}
              </div>
            </div>

            <Textarea
              placeholder={t.reAnalysisPlaceholder}
              value={reAnalysisNote}
              onChange={(e) => setReAnalysisNote(e.target.value)}
              rows={2}
              className="w-full min-h-[64px] text-xs leading-relaxed bg-muted/20 border-border rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500 p-3 resize-y"
            />

            {/* شريط تحديد الصفحات لإعادة التحليل */}
            <div className="bg-muted/30 p-3 rounded-xl border border-border/70 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span>
                      {lang === "ar"
                        ? `تحديد الصفحات لإعادة التحليل (${selectedImageIds.length} من ${images.length})`
                        : `Select Pages to Re-analyze (${selectedImageIds.length} of ${images.length})`}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllImages}
                    className="h-6 text-[11px] font-bold px-2 rounded-lg border-border hover:border-orange-500/40"
                  >
                    {t.selectAllPages}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllImages}
                    disabled={selectedImageIds.length === 0}
                    className="h-6 text-[11px] font-bold px-2 rounded-lg border-border hover:border-orange-500/40"
                  >
                    {t.deselectAllPages}
                  </Button>
                  {activeImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!selectedImageIds.includes(activeImage.id)) {
                          setSelectedImageIds((prev) => [...prev, activeImage.id]);
                        }
                      }}
                      className="h-6 text-[11px] text-orange-600 dark:text-orange-400 px-2"
                    >
                      {lang === "ar"
                        ? `+ تحديد الصفحة الحالية (#${getDisplayPageNumber(activeImage, activeImageIndex)})`
                        : `+ Select Current (#${getDisplayPageNumber(activeImage, activeImageIndex)})`}
                    </Button>
                  )}
                </div>
              </div>

              {/* أزرار الصفحات السريعة (Page Chips) */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                {images.map((img, idx) => {
                  const isSelected = selectedImageIds.includes(img.id);
                  const isCurrent = activeImageIndex === idx;
                  const pageNum = getDisplayPageNumber(img, idx);
                  const hasResults = Boolean(resultsMap[img.id]);

                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => toggleSelectImage(img.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                          : "bg-background/80 hover:bg-muted text-muted-foreground border-border/80"
                      } ${isCurrent ? "ring-2 ring-orange-500 ring-offset-1" : ""}`}
                      title={img.name}
                    >
                      <span>
                        {isSelected ? "☑" : "☐"} #{pageNum}
                      </span>
                      {hasResults && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-green-500"}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* أزرار تنفيذ إعادة التحليل مع خيار التحكم بالمؤثرات الصوتية */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleAnalyzeSelected(false)}
                  disabled={isAnalyzing || selectedImageIds.length === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-2 text-xs font-bold h-8 px-4 rounded-xl shadow-sm disabled:opacity-50"
                  title={
                    selectedImageIds.length === 0
                      ? t.noPagesSelected
                      : `إعادة تحليل ${selectedImageIds.length} صفحة محددة`
                  }
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  {selectedImageIds.length > 0
                    ? `${t.reAnalyzeSelected(selectedImageIds.length)} (OCR + ترجمة)`
                    : `${t.reAnalyze} الصفحات المحددة`}
                </Button>
                <Button
                  onClick={() => handleAnalyzeSelected(true)}
                  disabled={isAnalyzing || selectedImageIds.length === 0}
                  variant="outline"
                  className="border-orange-500/40 text-orange-600 dark:text-orange-400 gap-2 text-xs font-bold h-8 px-4 rounded-xl disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {selectedImageIds.length > 0
                    ? `${t.reAnalyzeSelected(selectedImageIds.length)} (OCR فقط)`
                    : `${t.reAnalyze} (OCR فقط)`}
                </Button>
                <Button
                  onClick={() => handleAnalyzeCurrent(false)}
                  disabled={isAnalyzing}
                  variant="secondary"
                  className="gap-2 text-xs font-bold h-8 px-3 rounded-xl border border-border"
                  title={t.reAnalyzeCurrentPageOnly}
                >
                  <RefreshCw className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {lang === "ar"
                      ? `الصفحة الحالية فقط (#${activeImage ? getDisplayPageNumber(activeImage, activeImageIndex) : activeImageIndex + 1})`
                      : `Current Page Only (#${activeImage ? getDisplayPageNumber(activeImage, activeImageIndex) : activeImageIndex + 1})`}
                  </span>
                </Button>
              </div>

              {/* خيار سريع للتحكم في استخراج المؤثرات الصوتية */}
              <label
                className={`flex items-center gap-2 cursor-pointer px-3 py-1 rounded-xl border text-xs font-semibold select-none transition-colors ${
                  config.extractSFX
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300"
                    : "bg-muted/40 border-border text-muted-foreground"
                }`}
                title={
                  config.extractSFX
                    ? lang === "ar"
                      ? "المؤثرات الصوتية مفعلة (انقر للتعطيل)"
                      : "SFX extraction active (click to disable)"
                    : lang === "ar"
                      ? "المؤثرات الصوتية معطلة ولن يتم استخراجها (انقر للتفعيل)"
                      : "SFX extraction disabled (click to enable)"
                }
              >
                <input
                  type="checkbox"
                  checked={config.extractSFX}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setConfig((prev) => ({ ...prev, extractSFX: checked }));
                  }}
                  className="w-3.5 h-3.5 rounded border-orange-500 accent-orange-600 cursor-pointer shrink-0"
                />
                <span>
                  {t.sfxLabel}
                  {!config.extractSFX && (
                    <span className="text-[10px] opacity-80 mr-1 ml-1 text-red-500 font-normal">
                      ({lang === "ar" ? "معطل" : "Off"})
                    </span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[750px]">
              <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center text-xs text-muted-foreground font-semibold">
                <span>
                  {t.pagePreview} (#
                  {activeImage
                    ? getDisplayPageNumber(activeImage, activeImageIndex)
                    : activeImageIndex + 1}
                  )
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showOverlay ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOverlay(!showOverlay)}
                    className={`h-7 text-[11px] font-bold gap-1 rounded-lg ${showOverlay ? "bg-orange-600 text-white shadow-md" : ""}`}
                  >
                    {showOverlay ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {t.visualOverlay}
                  </Button>
                </div>
              </div>
              <CardContent className="p-4 flex-1 overflow-y-auto flex justify-center items-start relative">
                {activeImage ? (
                  <div className="relative w-full max-w-[550px]">
                    <img
                      src={activeImage.url}
                      alt="Manga Page"
                      className="w-full h-auto object-contain rounded-lg shadow-md"
                    />
                    {showOverlay &&
                      currentItems.map((item, idx) => {
                        const hasPreciseCoords =
                          typeof item.leftPercent === "number" &&
                          typeof item.widthPercent === "number";

                        const bubbleStyle: React.CSSProperties = hasPreciseCoords
                          ? {
                              top: `${item.topPercent ?? (idx + 1) * 15}%`,
                              left: `${item.leftPercent}%`,
                              width: `${Math.max(14, Math.min(85, item.widthPercent || 25))}%`,
                              ...(item.heightPercent
                                ? { minHeight: `${Math.max(4, item.heightPercent)}%` }
                                : {}),
                            }
                          : {
                              top: `${item.topPercent ?? (idx + 1) * 15}%`,
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: "85%",
                            };

                        return (
                          <div
                            key={item.id}
                            onMouseEnter={() => setHoveredItemId(item.id)}
                            onMouseLeave={() => setHoveredItemId(null)}
                            onClick={() => handleQuickCopyTranslation(item.id, item.translatedText)}
                            style={bubbleStyle}
                            title={t.clickBubbleToCopy}
                            className={`absolute bg-black/85 backdrop-blur-md text-white border text-center p-2 rounded-xl text-xs font-bold transition-all shadow-xl cursor-pointer select-none ${
                              hoveredItemId === item.id
                                ? "border-orange-500 scale-105 bg-orange-950/90 text-orange-200 ring-2 ring-orange-500 z-20"
                                : "border-orange-500/40 hover:border-orange-400 z-10"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-orange-400 mb-0.5 px-1 gap-1">
                              <span className="truncate">
                                #{idx + 1} ({item.category})
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {item.confidence !== undefined && (
                                  <span className="text-[9px] font-mono bg-white/10 text-orange-200 px-1 rounded">
                                    {Math.round(item.confidence * 100)}%
                                  </span>
                                )}
                                <span className="flex items-center gap-1 text-[9px] font-semibold bg-orange-500/20 text-orange-200 px-1.5 py-0.5 rounded">
                                  {copiedBubbleId === item.id ? (
                                    <>
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">{t.copied}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" />
                                      <span>{t.quickCopyTranslation}</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="leading-snug break-words">{item.translatedText}</div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground m-auto">{t.noImage}</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 h-[750px] overflow-y-auto pl-2 pr-1 custom-scrollbar">
              <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/50">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  {t.extractedTexts} ({currentItems.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNewBubble}
                    className="h-8 text-xs font-bold gap-1.5 rounded-lg border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 shadow-sm cursor-pointer"
                    title={t.addNewBubble}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addNewBubble}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPageFormatted}
                    className="h-8 text-xs font-bold gap-1.5 rounded-lg border-orange-500/30 text-orange-600 dark:text-orange-400 shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {t.copyAllPage}
                  </Button>
                </div>
              </div>

              {currentItems.map((item, idx) => (
                <Card
                  key={item.id}
                  id={`bubble-card-${item.id}`}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  className={`p-4 space-y-3 border-border rounded-xl shadow-sm transition-all duration-200 ${
                    hoveredItemId === item.id
                      ? "border-orange-500 ring-1 ring-orange-500/40 bg-orange-500/5"
                      : "hover:border-orange-500/30"
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center text-xs text-muted-foreground font-semibold gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">
                        {t.paragraph} #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => handleMoveItem(idx, "up")}
                          className="h-6 w-6 rounded-md"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={idx === currentItems.length - 1}
                          onClick={() => handleMoveItem(idx, "down")}
                          className="h-6 w-6 rounded-md"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.confidence !== undefined && (
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          title="Confidence"
                        >
                          {Math.round(item.confidence * 100)}% {lang === "ar" ? "دقة" : "conf"}
                        </span>
                      )}
                      {typeof item.leftPercent === "number" && (
                        <span
                          className="hidden md:inline-flex items-center text-[10px] text-muted-foreground/80 font-mono px-1.5 py-0.5 rounded bg-muted/60"
                          title="Position"
                        >
                          X:{Math.round(item.leftPercent)}% Y:{Math.round(item.topPercent ?? 0)}%
                        </span>
                      )}
                      {item.fromTM && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Zap className="w-3 h-3 text-emerald-500" />
                          {t.translatedFromTM}
                        </span>
                      )}

                      {/* Split Bubble Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSplitModal(item, idx)}
                        className="h-7 px-2.5 text-[11px] gap-1.5 font-bold border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 rounded-lg shadow-xs"
                        title={t.splitBubble}
                      >
                        <Split className="w-3.5 h-3.5" />
                        <span>{t.splitBubble}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retranslatingBubbleId === item.id || isAnalyzing}
                        onClick={() => handleReTranslateBubble(item)}
                        className="h-7 px-2 text-[11px] gap-1 font-bold border-border/80 text-muted-foreground hover:text-foreground rounded-lg"
                        title={t.reTranslateBubble}
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${retranslatingBubbleId === item.id ? "animate-spin text-orange-500" : ""}`}
                        />
                        <span className="hidden sm:inline">
                          {retranslatingBubbleId === item.id
                            ? t.reTranslating
                            : t.reTranslateBubble}
                        </span>
                      </Button>

                      {/* Quick Copy for Photoshop / Typesetting */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleQuickCopyTranslation(item.id, item.translatedText)}
                        className="h-7 px-2 text-[11px] gap-1 font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-lg shadow-xs"
                        title={t.quickCopyPhotoshop}
                      >
                        {copiedBubbleId === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {t.copied}
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{t.quickCopyTranslation}</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopyText(formatItemText(item.translatedText, item.category))
                        }
                        className="h-7 px-2 text-[11px] gap-1 font-bold text-muted-foreground hover:text-orange-500"
                        title={t.copyBubbleWithTags}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t.copyBubbleWithTags}</span>
                      </Button>

                      {/* Insert Below Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsertBubbleBelow(idx)}
                        className="h-7 px-2 text-[11px] gap-1 font-medium text-muted-foreground hover:text-foreground rounded-lg"
                        title={t.insertBubbleBelow}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">{t.insertBubbleBelow}</span>
                      </Button>

                      {/* Delete Bubble Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBubble(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        title={t.deleteBubble}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      <Select
                        value={item.category}
                        onValueChange={(val) => updateItem(item.id, "category", val)}
                      >
                        <SelectTrigger className="w-[140px] h-7 text-xs font-bold rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {tags.map((tag) => (
                            <SelectItem
                              key={tag.value}
                              value={tag.value}
                              className="text-xs font-medium"
                            >
                              {getTagLabel(tag, lang)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {t.originalText}
                    </Label>
                    <Textarea
                      value={item.originalText}
                      onChange={(e) => updateItem(item.id, "originalText", e.target.value)}
                      className="min-h-[50px] text-sm dir-ltr bg-muted/30 border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        {t.translatedText}
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const textarea = document.getElementById(
                              `translated-textarea-${item.id}`,
                            ) as HTMLTextAreaElement | null;
                            let sel = "";
                            if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                              sel = textarea.value.substring(
                                textarea.selectionStart,
                                textarea.selectionEnd,
                              );
                            }
                            handleOpenSplitModal(item, idx, sel);
                          }}
                          className="text-[11px] font-bold flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-orange-500/10"
                          title={t.splitBubble}
                        >
                          <Split className="w-3 h-3" />
                          <span>{t.splitBubble}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCopyTranslation(item.id, item.translatedText)}
                          className="text-[11px] font-bold flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-orange-500/10"
                          title={t.quickCopyPhotoshop}
                        >
                          {copiedBubbleId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {t.copied}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t.quickCopyPhotoshop}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <Textarea
                      id={`translated-textarea-${item.id}`}
                      value={item.translatedText}
                      onChange={(e) => updateItem(item.id, "translatedText", e.target.value)}
                      className="min-h-[50px] text-sm font-medium bg-card rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500"
                    />
                  </div>
                </Card>
              ))}

              {/* Optional slim ad at end of bubbles list */}
              <div className="pt-2 pb-1">
                <AdSlot id="ad-editor-bubbles-bottom" format="compact" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Glossary Management Modal */}
      <AdvancedGlossaryModal
        open={showGlossaryModal}
        onOpenChange={setShowGlossaryModal}
        glossary={glossary}
        onUpdateGlossary={setGlossary}
      />

      {/* Translation Memory Modal */}
      <TranslationMemoryModal open={showTMModal} onOpenChange={setShowTMModal} />

      {/* Global Find & Replace Modal */}
      <GlobalFindReplaceModal
        open={showGlobalFindReplaceModal}
        onOpenChange={setShowGlobalFindReplaceModal}
        images={images}
        resultsMap={resultsMap}
        activeImageIndex={activeImageIndex}
        onSelectImageIndex={setActiveImageIndex}
        onUpdateResultsMap={(newMap) => setResultsMap(newMap)}
        onHighlightBubble={handleHighlightBubble}
      />

      {/* Split Bubble Modal */}
      <SplitBubbleModal
        open={!!splitModalBubble}
        onOpenChange={(open) => {
          if (!open) {
            setSplitModalBubble(null);
            setSplitInitialSelection("");
          }
        }}
        bubble={splitModalBubble?.bubble || null}
        bubbleIndex={splitModalBubble?.index ?? 0}
        tags={tags}
        initialSelectedText={splitInitialSelection}
        onConfirmSplit={handleConfirmSplitBubble}
      />

      {/* Google Drive / Cloud Import Modal */}
      <DriveImportModal
        open={showDriveModal}
        onOpenChange={setShowDriveModal}
        onImagesImported={handleDriveImagesImported}
      />

      {/* Google Docs Export Modal with user email & cloud link */}
      <GoogleDocsExportModal
        open={showGoogleDocsModal}
        onOpenChange={setShowGoogleDocsModal}
        isVip={isVip}
        currentUserEmail={currentUserEmail}
        images={images as any}
        resultsMap={resultsMap as any}
        tags={tags}
        tagsEnabled={tagsEnabled}
        startPageNumber={startPageNumber}
        useFilenamePageNumber={useFilenamePageNumber}
      />

      {/* AI Literary Proofreader Modal */}
      <AIProofreaderModal
        open={showProofreaderModal}
        onOpenChange={setShowProofreaderModal}
        isVip={isVip}
        apiKey={cleanApiKey}
        model={selectedModel}
        activeImage={activeImage as any}
        images={images as any}
        resultsMap={resultsMap as any}
        onApplyPolishedBubbles={(updatedMap) => {
          setResultsMap((prev) => ({ ...prev, ...(updatedMap as any) }));
        }}
      />

      {/* VIP Perks Overview Modal */}
      <VipPerksModal
        open={showVipPerksModal}
        onOpenChange={setShowVipPerksModal}
        isVip={isVip}
        currentUserEmail={currentUserEmail}
        onUpgradeToVip={() => window.dispatchEvent(new CustomEvent("open_auth_modal"))}
      />

      {/* Shared Document Viewer Modal (reads ?view_doc=...) */}
      <SharedDocumentViewerModal />
    </div>
  );
}
