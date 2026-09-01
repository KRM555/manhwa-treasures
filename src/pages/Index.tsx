import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect } from 'react';
import { UploadZone } from '@/components/UploadZone';
import { SidebarInfoCards } from '@/components/SidebarInfoCards';
import { TranslationConfig } from '@/types/manga';
import { ArrowLeft, Download, Sparkles, RefreshCw, Sun, Moon, Languages, Images, Trash2, ExternalLink, FileText, Plus, Settings2, Play, FileDown, ChevronDown, Copy, ArrowUp, ArrowDown, Search, Replace, RotateCcw, FolderPlus, BookOpen, Eye, EyeOff, CircleHelp as HelpCircle, Info, Paperclip, Loader as Loader2, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, KeyRound, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface ExtractedText {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
  topPercent?: number;
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

export interface GlossaryItem {
  id: string;
  original: string;
  translation: string;
}

const DEFAULT_TAGS: TagRule[] = [
  { value: 'dialogue', label: 'حوار (Dialogue)', prefix: '"": ', suffix: '' },
  { value: 'thought', label: 'أفكار (Thought)', prefix: '(): ', suffix: '' },
  { value: 'scream', label: 'صراخ (Scream)', prefix: '<>: ', suffix: '' },
  { value: 'system', label: 'نظام (System)', prefix: '[]: ', suffix: '' },
  { value: 'phone', label: 'هاتف (Phone)', prefix: '**: ', suffix: '' },
  { value: 'narrator', label: 'راوي (Narrator)', prefix: 'NA: ', suffix: '' },
  { value: 'sfx', label: 'مؤثر صوتي (SFX)', prefix: 'sfx: ', suffix: '' },
  { value: 'whisper', label: 'همس (Whisper)', prefix: 'ST: ', suffix: '' },
  { value: 'other', label: 'أخرى (Other)', prefix: '', suffix: '' },
];

const AVAILABLE_MODELS = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (الأسرع والأحدث)' },
  { id: 'gemini-3.6-pro', label: 'Gemini 3.6 Pro (أعلى جودة وسياق)' },
  { id: 'custom', label: 'نموذج مخصص (Custom Model)...' }
];

const UI_TEXT = {
  ar: {
    subtitle: 'أداة استخراج وترجمة وتنسيق سكريبتات الويب تون والمانجا',
    apiLabel: 'مفتاح Gemini API:',
    apiKeyPlaceholder: 'AIzaSy... أو مفتاحك الخاص',
    backToUpload: 'العودة للرفع',
    reAnalyze: 'إعادة التحليل',
    analyzeAll: 'تحليل كافة الصور',
    extractOcrOnly: 'استخراج النص فقط (OCR)',
    exportOriginal: 'تصدير النص الأصلي (OCR)',
    exportTranslated: 'تصدير النص المترجم',
    exportCurrentPage: 'الصفحة الحالية فقط',
    exportAllPages: 'كافة الصفحات',
    pagePreview: 'معاينة الصفحة',
    extractedTexts: 'النصوص المستخرجة',
    originalText: 'النص الأصلي:',
    translatedText: 'النص المترجم / الناتج:',
    noImage: 'لا توجد صورة محددة',
    page: 'صفحة',
    multiImageLimit: 'الحد الأقصى هو 10 صور فقط',
    paragraph: 'فقرة',
    selectImageFirst: 'الرجاء اختيار صورة واحدة على الأقل',
    enterApiKey: 'يرجى إدخال مفتاح Gemini API أولاً',
    analyzing: 'جاري معالجة واستخراج النصوص بواسطة Gemini...',
    successExtract: 'تم استخراج النصوص بنجاح!',
    noItemsToExport: 'لا توجد نصوص لتصديرها لهذه الصفحة',
    clearAll: 'حذف الكل',
    tagSettings: 'إعدادات العلامات',
    addNewTag: 'إضافة علامة جديدة',
    tagName: 'اسم العلامة',
    tagPrefix: 'البادئة',
    tagSuffix: 'اللاحقة',
    add: 'إضافة',
    resetDefaultTags: 'استعادة العلامات الافتراضية',
    newProject: 'مشروع جديد',
    copyBlock: 'نسخ الفقرة',
    copyAllPage: 'نسخ نصوص الصفحة',
    copied: 'تم النسخ!',
    findReplace: 'البحث والاستبدال',
    findPlaceholder: 'بحث عن كلمة...',
    replacePlaceholder: 'استبدال بـ...',
    replaceCurrentPage: 'في هذه الصفحة',
    replaceAllPages: 'في كل الصفحات',
    glossaryTitle: 'قاموس المصطلحات والأسماء',
    origTerm: 'الاسم/المصطلح الأصلي',
    transTerm: 'الترجمة المعتمدة',
    addGlossary: 'إضافة للقاموس',
    visualOverlay: 'المعاينة البصرية النصية',
    howToUse: 'كيفية الاستخدام',
    uploadReference: 'إرفاق ملف ترجمة سابقة كمرجع (اختياري)',
    referenceUploaded: 'تم إرفاق المرجع:',
    testApiKey: 'فحص واختبار المفتاح',
    selectModel: 'النموذج المستخدم',
  },
  en: {
    subtitle: 'Webtoon & Manga OCR, Translation and Typesetting tool',
    apiLabel: 'Gemini API Key:',
    apiKeyPlaceholder: 'AIzaSy... or your API key',
    backToUpload: 'Back to Upload',
    reAnalyze: 'Re-analyze',
    analyzeAll: 'Analyze All Images',
    extractOcrOnly: 'Extract Text Only (OCR)',
    exportOriginal: 'Export Original (OCR)',
    exportTranslated: 'Export Translated',
    exportCurrentPage: 'Current Page Only',
    exportAllPages: 'All Pages',
    pagePreview: 'Page Preview',
    extractedTexts: 'Extracted Texts',
    originalText: 'Original Text:',
    translatedText: 'Translated / Result Text:',
    noImage: 'No image selected',
    page: 'Page',
    multiImageLimit: 'Maximum limit is 10 images',
    paragraph: 'Block',
    selectImageFirst: 'Please select at least one image',
    enterApiKey: 'Please enter your Gemini API Key first',
    analyzing: 'Processing text with Gemini...',
    successExtract: 'Texts successfully extracted!',
    noItemsToExport: 'No texts available to export',
    clearAll: 'Clear All',
    tagSettings: 'Tag Formatting',
    addNewTag: 'Add Custom Tag',
    tagName: 'Tag Name',
    tagPrefix: 'Prefix',
    tagSuffix: 'Suffix',
    add: 'Add Tag',
    resetDefaultTags: 'Reset Default Tags',
    newProject: 'New Project',
    copyBlock: 'Copy Block',
    copyAllPage: 'Copy Page Texts',
    copied: 'Copied!',
    findReplace: 'Find & Replace',
    findPlaceholder: 'Find text...',
    replacePlaceholder: 'Replace with...',
    replaceCurrentPage: 'Current Page',
    replaceAllPages: 'All Pages',
    glossaryTitle: 'Character & Term Glossary',
    origTerm: 'Original Name/Term',
    transTerm: 'Approved Translation',
    addGlossary: 'Add to Glossary',
    visualOverlay: 'Visual Text Overlay',
    howToUse: 'How to Use',
    uploadReference: 'Upload previous translation reference (Optional)',
    referenceUploaded: 'Reference uploaded:',
    testApiKey: 'Test API Key',
    selectModel: 'Selected Model',
  },
};

export default function Index() {
  const [images, setImages] = useState<ImageItem[]>(() => {
    const saved = localStorage.getItem('manga_studio_images');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [view, setView] = useState<'upload' | 'results'>('upload');
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [currentProcessingMsg, setCurrentProcessingMsg] = useState<string>('');

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('gemini_selected_model') || 'gemini-3.7-flash';
  });
  const [customModelName, setCustomModelName] = useState<string>('');

  const [config, setConfig] = useState<TranslationConfig>({
    targetLanguage: 'ar',
    extractSFX: true,
    detectVerticalText: true,
  });

  const [resultsMap, setResultsMap] = useState<Record<string, ExtractedText[]>>(() => {
    const saved = localStorage.getItem('manga_studio_results');
    return saved ? JSON.parse(saved) : {};
  });

  const [tags, setTags] = useState<TagRule[]>(() => {
    const saved = localStorage.getItem('custom_manga_tags');
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });

  const [glossary, setGlossary] = useState<GlossaryItem[]>(() => {
    const saved = localStorage.getItem('manga_glossary');
    return saved ? JSON.parse(saved) : [];
  });
  const [newGlossaryOrig, setNewGlossaryOrig] = useState('');
  const [newGlossaryTrans, setNewGlossaryTrans] = useState('');

  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagPrefix, setNewTagPrefix] = useState('');
  const [newTagSuffix, setNewTagSuffix] = useState('');

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceFileName, setReferenceFileName] = useState<string>('');
  const [showKeyHelpModal, setShowKeyHelpModal] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('gemini_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('custom_manga_tags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('manga_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    try {
      localStorage.setItem('manga_studio_results', JSON.stringify(resultsMap));
    } catch (e) {
      console.warn('Storage limit reached for results');
    }
  }, [resultsMap]);

  useEffect(() => {
    try {
      localStorage.setItem('manga_studio_images', JSON.stringify(images));
    } catch (e) {
      console.warn('Storage limit reached for images');
    }
  }, [images]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const t = UI_TEXT[lang];
  const activeImage = images[activeImageIndex] || null;
  const currentItems = activeImage ? (resultsMap[activeImage.id] || []) : [];

  // Strip spaces and surrounding quotes cleanly
  const cleanApiKey = apiKey.replace(/[\s\r\n\t"']/g, '').trim();

  const getEffectiveModel = () => {
    if (selectedModel === 'custom' && customModelName.trim()) {
      return customModelName.trim();
    }
    return selectedModel || 'gemini-3.7-flash';
  };

  const handleTestApiKey = async () => {
    if (!cleanApiKey) {
      toast.error(t.enterApiKey);
      return;
    }

    setIsTestingKey(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`
      );
      const data = await res.json();
      
      if (res.ok && data?.models) {
        toast.success(
          lang === 'ar' 
            ? `✅ المفتاح صحيح وفعال 100%! متصل بنجاح مع Google Gemini (${data.models.length} نماذج متاحة).` 
            : `✅ Gemini API Key is valid! (${data.models.length} models available).`
        );
      } else {
        const errMsg = data?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        toast.error(`❌ خطأ من Google: ${errMsg}`, { duration: 6000 });
        if (cleanApiKey.startsWith('AQ.')) {
          setShowKeyHelpModal(true);
        }
      }
    } catch (err: any) {
      toast.error(`❌ تعذر الاتصال: ${err.message}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleImageSelected = (url: string, name: string) => {
    if (images.length >= 10) {
      toast.error(t.multiImageLimit);
      return;
    }
    const newImage: ImageItem = { id: `img_${Date.now()}_${Math.random()}`, url, name };
    setImages((prev) => [...prev, newImage]);
    setActiveImageIndex(images.length);
  };

  const handleMultipleImagesSelected = (newImages: { url: string; name: string }[]) => {
    const formatted = newImages.map((img) => ({
      id: `img_${Date.now()}_${Math.random()}`,
      url: img.url,
      name: img.name,
    }));
    setImages((prev) => [...prev, ...formatted].slice(0, 10));
    setActiveImageIndex(0);
  };

  const handleRemoveImage = (index: number) => {
    const imgToRemove = images[index];
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    
    if (imgToRemove) {
      const newMap = { ...resultsMap };
      delete newMap[imgToRemove.id];
      setResultsMap(newMap);
    }

    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleClearAllImages = () => {
    setImages([]);
    setActiveImageIndex(0);
    setResultsMap({});
    setReferenceText('');
    setReferenceFileName('');
    localStorage.removeItem('manga_studio_results');
    localStorage.removeItem('manga_studio_images');
    toast.success(lang === 'ar' ? 'تم بدء مشروع جديد' : 'New project started');
  };

  const handleSaveApiKey = (key: string) => {
    const cleaned = key.replace(/[\s\r\n\t"']/g, '').trim();
    setApiKey(cleaned);
    localStorage.setItem('gemini_api_key', cleaned);
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceText(event.target?.result as string);
      setReferenceFileName(file.name);
      toast.success(lang === 'ar' ? 'تم استيراد المرجع بنجاح!' : 'Reference imported!');
    };
    reader.readAsText(file);
  };

  const handleAddCustomTag = () => {
    if (!newTagLabel.trim()) return;
    const val = `custom_${Date.now()}`;
    const newTag: TagRule = {
      value: val,
      label: newTagLabel,
      prefix: newTagPrefix,
      suffix: newTagSuffix,
    };
    setTags([...tags, newTag]);
    setNewTagLabel('');
    setNewTagPrefix('');
    setNewTagSuffix('');
    toast.success(lang === 'ar' ? 'تمت إضافة العلامة!' : 'Tag added!');
  };

  const handleDeleteTag = (index: number) => {
    if (tags.length <= 1) return;
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleAddGlossaryItem = () => {
    if (!newGlossaryOrig.trim() || !newGlossaryTrans.trim()) return;
    const item: GlossaryItem = {
      id: `g_${Date.now()}`,
      original: newGlossaryOrig.trim(),
      translation: newGlossaryTrans.trim(),
    };
    setGlossary([...glossary, item]);
    setNewGlossaryOrig('');
    setNewGlossaryTrans('');
    toast.success(lang === 'ar' ? 'تمت إضافة المصطلح' : 'Term added');
  };

  const handleDeleteGlossaryItem = (id: string) => {
    setGlossary(glossary.filter((item) => item.id !== id));
  };

  const formatTextWithRules = (text: string, categoryVal: string): string => {
    const cleanText = text.trim();
    const rule = tags.find((t) => t.value === categoryVal);
    if (!rule) return cleanText;
    return `${rule.prefix}${cleanText}${rule.suffix}`;
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (!activeImage) return;
    const items = [...currentItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    setResultsMap((prev) => ({ ...prev, [activeImage.id]: items }));
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  const handleCopyPageFormatted = () => {
    if (currentItems.length === 0) return;
    const fullText = currentItems
      .map((item) => formatTextWithRules(item.translatedText, item.category))
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    toast.success(t.copied);
  };

  const handleFindAndReplace = (scope: 'current' | 'all') => {
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

    if (scope === 'current' && activeImage) {
      if (newMap[activeImage.id]) {
        newMap[activeImage.id] = processList(newMap[activeImage.id]);
      }
    } else {
      Object.keys(newMap).forEach((imgId) => {
        newMap[imgId] = processList(newMap[imgId]);
      });
    }

    setResultsMap(newMap);
    toast.success(
      lang === 'ar'
        ? `تم استبدال الكلمة ${totalReplacements} مرة!`
        : `Replaced ${totalReplacements} occurrences!`
    );
  };

  const parseJsonFromResponse = (raw: string): ExtractedText[] | null => {
    try {
      return JSON.parse(raw);
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          // ignore
        }
      }
      const firstBracket = raw.indexOf('[');
      const lastBracket = raw.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        try {
          return JSON.parse(raw.substring(firstBracket, lastBracket + 1));
        } catch {
          // ignore
        }
      }
    }
    return null;
  };

  const processGeminiRequest = async (targetImg: ImageItem, ocrOnly = false): Promise<{ data: ExtractedText[] | null; error?: string }> => {
    if (!cleanApiKey) {
      return { data: null, error: 'مفتاح الـ API فارغ' };
    }

    const mimeTypeMatch = targetImg.url.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const base64Data = targetImg.url.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const glossaryPrompt = glossary.length > 0
      ? `Strictly use this Glossary for translated names/terms: ${glossary.map(g => `${g.original} => ${g.translation}`).join('; ')}.`
      : '';

    const refContextPrompt = referenceText
      ? `\nIMPORTANT CONTEXT: Use the following text from a previous chapter as a reference to maintain consistent tone, style, and character naming:\n"""\n${referenceText.substring(0, 5000)}\n"""\n`
      : '';

    const promptText = ocrOnly
      ? `You are an expert manga and webtoon OCR system.
Extract all original texts top to bottom in natural reading order.
Estimate topPercent (0 to 100) position of each bubble on the page.
Categorize each block into one of: (${tags.map(t => t.value).join(', ')}).
Return ONLY a valid JSON array of objects with keys: id, originalText, translatedText, category, topPercent.`
      : `You are an expert manga and webtoon OCR and translator.
Extract all texts from the image in reading order (top to bottom).
Estimate topPercent (0 to 100) relative vertical position on the page for each text bubble.
Categorize each block into one of these types: (${tags.map(t => t.value).join(', ')}).
Translate all extracted texts to ${config.targetLanguage === 'ar' ? 'Arabic (العربية)' : 'English'}.
${glossaryPrompt}
${refContextPrompt}
Return ONLY a valid JSON array of objects with keys: id, originalText, translatedText, category, topPercent.`;

    const primaryModel = getEffectiveModel();
    const modelsToTry = [
      primaryModel,
      'gemini-3.7-flash',
      'gemini-3.6-pro',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let lastErrorDetails = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inlineData: { mimeType, data: base64Data } },
                  { text: promptText },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          const msg = errBody?.error?.message || `HTTP ${response.status} (${response.statusText})`;
          lastErrorDetails = msg;

          if (response.status === 401 || response.status === 403) {
            return { 
              data: null, 
              error: `[Google ${response.status}] ${msg}` 
            };
          }
          continue;
        }

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawJsonText) {
          const parsedItems = parseJsonFromResponse(rawJsonText);
          if (parsedItems && Array.isArray(parsedItems)) {
            const formatted = parsedItems.map((item, idx) => ({
              ...item,
              id: item.id || `item_${idx}_${Date.now()}`,
              topPercent: item.topPercent ?? Math.min(95, Math.max(5, (idx + 1) * 15)),
              translatedText: ocrOnly ? item.originalText : item.translatedText,
            }));
            return { data: formatted };
          }
        }
      } catch (err: any) {
        lastErrorDetails = err?.message || 'Network fetch error';
      }
    }

    return { data: null, error: lastErrorDetails || 'Failed to connect to Google Gemini' };
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
    setCurrentProcessingMsg(lang === 'ar' ? `جاري معالجة واستخراج النصوص بواسطة ${getEffectiveModel()}...` : `Processing with ${getEffectiveModel()}...`);

    const { data: res, error } = await processGeminiRequest(activeImage, ocrOnly);
    if (res && res.length > 0) {
      setResultsMap((prev) => ({ ...prev, [activeImage.id]: res }));
      toast.success(t.successExtract);
      setView('results');
      if (activeImage) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            supabase.from('user_history').insert({
              user_id: session.user.id,
              image_name: activeImage.name,
              extracted_count: res.length,
            });
          }
        });
      }
    } else {
      const errorMsg = error || (lang === 'ar' ? 'تحقق من صلاحية مفتاح الـ API' : 'Check your API Key');
      toast.error(`❌ ${errorMsg}`, { duration: 8000 });
      if (cleanApiKey.startsWith('AQ.')) {
        setShowKeyHelpModal(true);
      }
    }
    setIsAnalyzing(false);
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

    setIsAnalyzing(true);
    const newMap = { ...resultsMap };
    let successCount = 0;
    let lastError = '';

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      setCurrentProcessingMsg(lang === 'ar' ? `جاري معالجة الصورة (${i + 1} من ${images.length})...` : `Processing image (${i + 1} of ${images.length})...`);
      const { data: res, error } = await processGeminiRequest(img, ocrOnly);
      if (res && res.length > 0) {
        newMap[img.id] = res;
        successCount++;
      } else if (error) {
        lastError = error;
        break;
      }
    }

    setResultsMap(newMap);
    setIsAnalyzing(false);

    if (successCount > 0) {
      toast.success(lang === 'ar' ? `تمت معالجة ${successCount} صورة بنجاح!` : `Processed ${successCount} images successfully!`);
      setView('results');
    } else {
      toast.error(`❌ خطأ: ${lastError || 'تعذر استخراج النصوص'}`, { duration: 8000 });
      if (cleanApiKey.startsWith('AQ.')) {
        setShowKeyHelpModal(true);
      }
    }
  };

  const handleExportText = (scope: 'current' | 'all', textType: 'original' | 'translated'): void => {
    const targetImages = scope === 'current' ? (activeImage ? [activeImage] : []) : images;
    if (targetImages.length === 0) return;

    let fullOutput = '';
    targetImages.forEach((img) => {
      const realIndex = images.findIndex((i) => i.id === img.id);
      const itemsForImg = resultsMap[img.id] || [];
      if (itemsForImg.length > 0) {
        fullOutput += `=== Page ${realIndex + 1}: ${img.name} ===\n\n`;
        itemsForImg.forEach((item) => {
          const contentToExport = textType === 'original' ? item.originalText : item.translatedText;
          fullOutput += formatTextWithRules(contentToExport, item.category) + '\n\n';
        });
        fullOutput += '\n';
      }
    });

    if (!fullOutput.trim()) {
      toast.error(t.noItemsToExport);
      return;
    }

    const blob = new Blob([fullOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const fileName = textType === 'original'
      ? (scope === 'current' ? `page_${activeImageIndex + 1}_ocr_original_script.txt` : `full_ocr_original_script.txt`)
      : (scope === 'current' ? `page_${activeImageIndex + 1}_translated_script.txt` : `full_translated_script.txt`);
    
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(lang === 'ar' ? `تم تصدير (${fileName}) بنجاح!` : `Exported (${fileName}) successfully!`);
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
    <div className={`min-h-screen bg-background text-foreground p-4 sm:p-8 w-full max-w-[1550px] mx-auto ${lang === 'ar' ? 'dir-rtl' : 'dir-ltr'}`}>
      {/* Header */}
      <header className="mb-6 flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-500">
            Manhwa Transtool Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* زر تسجيل الدخول والبروفايل */}
          <AuthModal />

          {/* اختيار النموذج (Model Selector) */}
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-2 h-9">
            <Cpu className="w-4 h-4 text-orange-500 shrink-0" />
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-7 text-xs font-bold border-0 bg-transparent focus:ring-0 w-44">
                <SelectValue placeholder={t.selectModel} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs font-medium">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedModel === 'custom' && (
              <Input
                placeholder="gemini-3.7-flash..."
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                className="h-7 text-xs w-36 dir-ltr"
              />
            )}
          </div>

          {/* زر مشروع جديد */}
          <Button
            variant="outline"
            onClick={handleClearAllImages}
            className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
          >
            <FolderPlus className="w-4 h-4 text-orange-500" />
            {t.newProject}
          </Button>

          {/* نافذة القاموس */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl border-orange-500/40 text-orange-600 dark:text-orange-400">
                <BookOpen className="w-4 h-4 text-orange-500" />
                {t.glossaryTitle} ({glossary.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold">{t.glossaryTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {glossary.map((g) => (
                    <div key={g.id} className="flex items-center justify-between bg-muted/40 p-2 rounded-lg text-xs">
                      <span className="font-bold text-foreground">{g.original}</span>
                      <span className="text-orange-500 font-bold">←</span>
                      <span className="font-bold text-foreground">{g.translation}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGlossaryItem(g.id)} className="h-6 w-6 text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {glossary.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">لا توجد مصطلحات أو أسماء محفوظة بعد</p>
                  )}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <Input placeholder={t.origTerm} value={newGlossaryOrig} onChange={(e) => setNewGlossaryOrig(e.target.value)} className="h-8 text-xs" />
                  <Input placeholder={t.transTerm} value={newGlossaryTrans} onChange={(e) => setNewGlossaryTrans(e.target.value)} className="h-8 text-xs" />
                  <Button onClick={handleAddGlossaryItem} className="w-full h-8 text-xs font-bold bg-orange-600 text-white">
                    <Plus className="w-3.5 h-3.5 ml-1" /> {t.addGlossary}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* إعدادات العلامات */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl">
                <Settings2 className="w-4 h-4 text-orange-500" />
                {t.tagSettings}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center justify-between">
                  <span>{t.tagSettings}</span>
                  <Button variant="ghost" size="sm" onClick={() => setTags(DEFAULT_TAGS)} className="text-xs text-muted-foreground hover:text-orange-500 gap-1">
                    <RotateCcw className="w-3.5 h-3.5" /> {t.resetDefaultTags}
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {tags.map((tag, i) => (
                    <div key={tag.value || i} className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg text-xs">
                      <span className="font-bold w-24 truncate">{tag.label}</span>
                      <Input
                        value={tag.prefix}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[i].prefix = e.target.value;
                          setTags(updated);
                        }}
                        className="h-7 text-xs w-16"
                        placeholder="Prefix"
                      />
                      <Input
                        value={tag.suffix}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[i].suffix = e.target.value;
                          setTags(updated);
                        }}
                        className="h-7 text-xs w-16"
                        placeholder="Suffix"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTag(i)} className="h-7 w-7 text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                  <Input placeholder={t.tagName} value={newTagLabel} onChange={(e) => setNewTagLabel(e.target.value)} className="h-8 text-xs" />
                  <div className="flex gap-2">
                    <Input placeholder={t.tagPrefix} value={newTagPrefix} onChange={(e) => setNewTagPrefix(e.target.value)} className="h-8 text-xs" />
                    <Input placeholder={t.tagSuffix} value={newTagSuffix} onChange={(e) => setNewTagSuffix(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Button onClick={handleAddCustomTag} className="w-full h-8 text-xs font-bold bg-orange-600 text-white">
                    <Plus className="w-3.5 h-3.5 ml-1" /> {t.add}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* نافذة كيفية الاستخدام (Tutorial) */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="h-9 gap-1 text-xs font-bold px-2 rounded-xl text-muted-foreground hover:text-orange-500">
                <HelpCircle className="w-4 h-4" />
                {t.howToUse}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-orange-600">كيف يعمل الموقع ومفتاح Gemini؟</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                <p>هذه الأداة مصممة لمساعدة المترجمين في استخراج وترجمة نصوص المانجا والويب تون بدقة وسرعة باستخدام الذكاء الاصطناعي (Gemini).</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>الخطوة 1:</strong> افتح <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-orange-500 font-bold underline">Google AI Studio</a> وأنشئ مفتاح API (يبدأ بـ <code>AIzaSy...</code>).</li>
                  <li><strong>الخطوة 2:</strong> ضع المفتاح في الخانة واضغط على أيقونة &quot;فحص&quot; للتأكد من اتصاله بخوادم Google.</li>
                  <li><strong>الخطوة 3:</strong> ارفع صور الفصل، واضغط &quot;تحليل الصورة&quot; ليتم التعرف عليها وترجمتها فوراً.</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>

          {/* زر ديسكورد مع مسار SVG نظيف */}
          <a 
            href="https://discord.gg/nuaqTHvx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-9 w-9 rounded-xl inline-flex items-center justify-center border border-input bg-background hover:bg-[#5865F2] hover:text-white hover:border-[#5865F2] transition-colors"
            title="انضم لسيرفر الديسكورد"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>

          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </Button>

          <Button variant="outline" className="h-9 gap-1.5 text-xs font-bold px-3 rounded-xl" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <Languages className="w-4 h-4 text-orange-500" />
            {lang === 'ar' ? 'English' : 'عربي'}
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
              {isTestingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              <span>{lang === 'ar' ? 'فحص' : 'Test'}</span>
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
        <DialogContent className="sm:max-w-lg rounded-2xl text-right dir-rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-orange-600">
              <KeyRound className="w-5 h-5" />
              <span>الحصول على مفتاح Google Gemini الصحيح مجاناً</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground mt-2">
            <p>
              لتشغيل الترجمة والاستخراج بالذكاء الاصطناعي، يرجى إنشاء مفتاح من <strong>Google AI Studio</strong> الرسمي:
            </p>
            <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2 text-xs text-foreground">
              <p>✅ <strong>المفتاح الصحيح:</strong> يبدأ دائماً بـ <code className="text-orange-500 font-mono font-bold">AIzaSy...</code></p>
              <p>❌ <strong>مفاتيح أخرى:</strong> المفاتيح التي تبدأ بـ <code className="font-mono text-red-400">AQ...</code> أو غيرها خاصة بخدمات سحابية أخرى وليست لـ Google AI Studio.</p>
            </div>
            <ol className="list-decimal list-inside space-y-2 font-medium text-foreground text-xs leading-relaxed">
              <li>اضغط على الزر البرتقالي بالأسفل لفتح <strong className="text-orange-500">Google AI Studio</strong>.</li>
              <li>سجل دخول بحساب Google الخاص بك.</li>
              <li>اضغط على <strong className="text-blue-500">&quot;Create API key&quot;</strong> ثم اختر <strong className="text-blue-500">&quot;Create API key in new project&quot;</strong>.</li>
              <li>انسخ المفتاح (يبدأ بـ <code className="text-orange-500 font-mono">AIzaSy...</code>) والصقه في الموقع واضغط &quot;فحص&quot;.</li>
            </ol>
            <div className="pt-2 flex gap-2">
              <Button 
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 rounded-xl"
                onClick={() => {
                  window.open('https://aistudio.google.com/app/apikey', '_blank');
                  setShowKeyHelpModal(false);
                }}
              >
                فتح Google AI Studio الآن <ExternalLink className="w-4 h-4 mr-2 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="text-xs h-10 rounded-xl"
                onClick={() => setShowKeyHelpModal(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bar for images */}
      {images.length > 0 && (
        <div className="mb-6 p-3 bg-card border border-border rounded-2xl flex items-center justify-between gap-3 overflow-x-auto shadow-sm">
          <div className="flex items-center gap-2">
            <Images className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
              {t.page} ({images.length}/10):
            </span>
            <div className="flex gap-1.5 overflow-x-auto py-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    activeImageIndex === idx ? 'bg-orange-600 text-white shadow-md' : 'bg-muted hover:bg-muted/80 text-foreground'
                  }`}
                >
                  #{idx + 1}
                  {resultsMap[img.id] && <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>}
                  <Trash2 className="w-3 h-3 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }} />
                </button>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearAllImages} className="text-xs text-red-500 font-bold shrink-0">
            {t.clearAll}
          </Button>
        </div>
      )}

      {/* Main View Switcher */}
      {view === 'upload' ? (
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
              lang={lang}
            />

            <div className="flex flex-col items-center justify-center mt-2">
              <Label htmlFor="ref-upload" className="cursor-pointer flex items-center gap-2 text-xs text-muted-foreground hover:text-orange-500 transition-colors bg-muted/30 px-4 py-2 rounded-xl border border-dashed border-border/60">
                <Paperclip className="w-4 h-4" />
                {referenceFileName ? (
                  <span className="font-bold text-orange-500">{t.referenceUploaded} {referenceFileName}</span>
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
                      <span className="text-sm font-bold text-foreground">{currentProcessingMsg}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-orange-500 h-full animate-[pulse_2s_ease-in-out_infinite] w-full origin-left scale-x-100"></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">يرجى الانتظار، جاري التواصل مع خوادم الذكاء الاصطناعي واستخراج النصوص...</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-3 w-full animate-in fade-in zoom-in">
                    <Button onClick={() => handleAnalyzeCurrent(false)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md">
                      <Sparkles className="w-4 h-4" /> {lang === 'ar' ? 'تحليل الصورة الحالية' : 'Analyze Current Image'}
                    </Button>
                    <Button onClick={() => handleAnalyzeCurrent(true)} variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 font-bold h-11 px-6 rounded-xl gap-2">
                      <FileText className="w-4 h-4" /> {t.extractOcrOnly}
                    </Button>
                    <Button onClick={() => handleAnalyzeAll(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold h-11 px-6 rounded-xl gap-2 shadow-md">
                      <Play className="w-4 h-4 text-orange-400" /> {t.analyzeAll} ({images.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <SidebarInfoCards lang={lang} />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-2xl border border-border gap-3 shadow-sm">
            <Button variant="outline" onClick={() => setView('upload')} className="gap-2 text-xs font-bold rounded-xl">
              <ArrowLeft className="w-4 h-4" /> {t.backToUpload}
            </Button>

            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60">
              <div className="flex items-center gap-1.5 px-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={t.findPlaceholder} value={findText} onChange={(e) => setFindText(e.target.value)} className="h-7 text-xs w-28 bg-background" />
              </div>
              <div className="flex items-center gap-1.5 px-1">
                <Replace className="w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder={t.replacePlaceholder} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="h-7 text-xs w-28 bg-background" />
              </div>
              <Button size="sm" variant="secondary" onClick={() => handleFindAndReplace('current')} className="h-7 text-[11px] font-bold px-2 rounded-lg">
                {t.replaceCurrentPage}
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleFindAndReplace('all')} className="h-7 text-[11px] font-bold px-2 rounded-lg">
                {t.replaceAllPages}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => handleAnalyzeCurrent(false)} disabled={isAnalyzing} className="gap-2 text-xs font-bold rounded-xl">
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} /> {t.reAnalyze}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400 gap-1.5 text-xs font-bold rounded-xl">
                    <FileDown className="w-4 h-4" /> {t.exportOriginal} <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => handleExportText('current', 'original')} className="text-xs cursor-pointer font-medium">{t.exportCurrentPage}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportText('all', 'original')} className="text-xs cursor-pointer font-medium">{t.exportAllPages}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs font-bold rounded-xl shadow-sm">
                    <Download className="w-4 h-4" /> {t.exportTranslated} <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => handleExportText('current', 'translated')} className="text-xs cursor-pointer font-medium">{t.exportCurrentPage}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportText('all', 'translated')} className="text-xs cursor-pointer font-medium">{t.exportAllPages}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl overflow-hidden border-border bg-zinc-950/5 flex flex-col h-[750px]">
              <div className="p-3 border-b border-border bg-card/60 flex justify-between items-center text-xs text-muted-foreground font-semibold">
                <span>{t.pagePreview} (#{activeImageIndex + 1})</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showOverlay ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOverlay(!showOverlay)}
                    className={`h-7 text-[11px] font-bold gap-1 rounded-lg ${showOverlay ? 'bg-orange-600 text-white shadow-md' : ''}`}
                  >
                    {showOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
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
                    {showOverlay && currentItems.map((item, idx) => (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        style={{ top: `${item.topPercent ?? ((idx + 1) * 15)}%` }}
                        className={`absolute left-1/2 -translate-x-1/2 w-[85%] bg-black/80 backdrop-blur-md text-white border text-center p-2 rounded-xl text-xs font-bold transition-all shadow-xl cursor-pointer ${
                          hoveredItemId === item.id
                            ? 'border-orange-500 scale-105 bg-orange-950/90 text-orange-200 ring-2 ring-orange-500 z-10'
                            : 'border-orange-500/40 hover:border-orange-400 z-0'
                        }`}
                      >
                        <span className="text-[10px] text-orange-400 block mb-0.5">#{idx + 1} ({item.category})</span>
                        {item.translatedText}
                      </div>
                    ))}
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

              {currentItems.map((item, idx) => (
                <Card
                  key={item.id}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  className={`p-4 space-y-3 border-border rounded-xl shadow-sm transition-all duration-200 ${
                    hoveredItemId === item.id
                      ? 'border-orange-500 ring-1 ring-orange-500/40 bg-orange-500/5'
                      : 'hover:border-orange-500/30'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center text-xs text-muted-foreground font-semibold gap-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-md font-bold">
                        {t.paragraph} #{idx + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" disabled={idx === 0} onClick={() => handleMoveItem(idx, 'up')} className="h-6 w-6 rounded-md">
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={idx === currentItems.length - 1} onClick={() => handleMoveItem(idx, 'down')} className="h-6 w-6 rounded-md">
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(formatTextWithRules(item.translatedText, item.category))}
                        className="h-7 px-2 text-[11px] gap-1 font-bold text-muted-foreground hover:text-orange-500"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {t.copyBlock}
                      </Button>

                      <Select value={item.category} onValueChange={(val) => updateItem(item.id, 'category', val)}>
                        <SelectTrigger className="w-[150px] h-8 text-xs font-bold rounded-lg bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {tags.map((tag) => (
                            <SelectItem key={tag.value} value={tag.value} className="text-xs font-medium">
                              {tag.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">{t.originalText}</Label>
                    <Textarea
                      value={item.originalText}
                      onChange={(e) => updateItem(item.id, 'originalText', e.target.value)}
                      className="min-h-[50px] text-sm dir-ltr bg-muted/30 border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {t.translatedText}
                    </Label>
                    <Textarea
                      value={item.translatedText}
                      onChange={(e) => updateItem(item.id, 'translatedText', e.target.value)}
                      className="min-h-[50px] text-sm font-medium bg-card rounded-lg focus-visible:ring-1 focus-visible:ring-orange-500"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}