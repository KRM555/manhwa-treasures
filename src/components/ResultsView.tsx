import React, { useState } from 'react';
import { Eye, Edit3, Download, ArrowRight, Layers, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CategorySetting {
  id?: string;
  name?: string;
  tag?: string;
  prefix?: string;
  label?: string;
  value?: string;
}

interface ResultsViewProps {
  pages: any[];
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  onReset: () => void;
  onUpdateBubble: (pageId: string, bubbleId: string, text: string, category: string) => void;
  categories?: CategorySetting[];
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  pages,
  activePageIndex,
  setActivePageIndex,
  onReset,
  onUpdateBubble,
  categories = [],
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const currentPage = pages[activePageIndex];

  const getCategoryTag = (categoryKey: string) => {
    if (!categories || categories.length === 0) {
      if (categoryKey === 'sfx') return 'SFX:';
      if (categoryKey === 'thought') return '::THOUGHT:';
      if (categoryKey === 'system') return '::SYSTEM:';
      return '::""';
    }

    const found = categories.find(
      (c) =>
        c.id === categoryKey ||
        c.name?.toLowerCase() === categoryKey.toLowerCase() ||
        c.value?.toLowerCase() === categoryKey.toLowerCase()
    );

    return found ? (found.prefix || found.tag || found.name || categoryKey) : '::""';
  };

  const formatBubbleText = (bubble: any) => {
    const tag = getCategoryTag(bubble.category);
    return `${tag} ${bubble.translatedText}`;
  };

  const handleExportTxt = () => {
    let content = '';
    pages.forEach((page, pIdx) => {
      content += `=== Page ${pIdx + 1} ===\n`;
      page.bubbles?.forEach((b: any) => {
        content += `${formatBubbleText(b)}\n`;
      });
      content += '\n';
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `typer_translation_${Date.now()}.txt`;
    link.click();
  };

  const copyCurrentPageTxt = () => {
    if (!currentPage) return;
    let content = '';
    currentPage.bubbles?.forEach((b: any) => {
      content += `${formatBubbleText(b)}\n`;
    });
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('تم نسخ نصوص الصفحة الحالية بالتنسيق المظبوط!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentPage) return null;

  const filteredBubbles = currentPage.bubbles?.filter((b: any) => {
    if (activeFilter === 'ALL') return true;
    return (b.category || 'dialogue').toUpperCase() === activeFilter;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* الشريط العلوي */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-slate-700 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رفع صور جديدة</span>
        </button>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-bold transition-all ${
              viewMode === 'editor'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>محرر التايبر (Editor)</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-bold transition-all ${
              viewMode === 'preview'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة مكبرة (Live Preview)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyCurrentPageTxt}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-orange-400" />}
            <span>نسخ الصفحة الحالية</span>
          </button>

          <button
            onClick={handleExportTxt}
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>تصدير الكل (TXT)</span>
          </button>
        </div>
      </div>

      {/* النوافذ الثلاث مع السكرول البرتقالي المخصص */}
      <div className="flex-1 grid grid-cols-12 gap-4 h-full min-h-0 overflow-hidden">
        
        {/* النافذة الأولى: سكرول الصفحات الجانبي البرتقالي */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col h-full min-h-0">
          <div className="border-b border-slate-800 pb-2 mb-3">
            <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-400" />
                الصفحات
              </span>
              <span className="bg-slate-800 text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                {pages.length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pl-1 pr-1">
            {pages.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setActivePageIndex(idx)}
                className={`w-full relative rounded-xl overflow-hidden border transition-all text-right p-1.5 flex flex-col gap-1.5 ${
                  activePageIndex === idx
                    ? 'border-orange-500 bg-orange-500/10 shadow-md shadow-orange-500/10 ring-1 ring-orange-500/50'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                }`}
              >
                <img
                  src={p.imageUrl}
                  alt={`Page ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg transition-all"
                />
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold text-slate-300">صفحة {idx + 1}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    {p.bubbles?.length || 0} نص
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* بقية النوافذ */}
        <div className="col-span-10 flex gap-4 h-full min-h-0 overflow-hidden">
          {viewMode === 'editor' ? (
            <>
              {/* النافذة الثانية: معاينة الصورة */}
              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full min-h-0 shadow-xl">
                <div className="border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-300">معاينة الصورة</span>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar p-2">
                  <img
                    src={currentPage.imageUrl}
                    alt="Manga Page"
                    className="max-w-full h-auto object-contain rounded-xl shadow-2xl"
                  />
                </div>
              </div>

              {/* النافذة الثالثة: المحرر مع سكرول أفقية للفلاتر وسكرول رأسي للنصوص */}
              <div className="w-[480px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full min-h-0 shadow-xl">
                
                {/* شريط الفلاتر الأفقي بسكرول برتقالي رفيع */}
                <div className="border-b border-slate-800 pb-3 mb-3 space-y-2">
                  <h3 className="font-bold text-sm text-slate-200">
                    TEXT BLOCKS ({currentPage.bubbles?.length || 0})
                  </h3>

                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1.5">
                    {['ALL', 'DIALOGUE', 'SFX', 'THOUGHT', 'SYSTEM'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                          activeFilter === filter
                            ? 'bg-orange-500 text-white font-bold'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* قائمة النصوص بالسكرول الرأسي البرتقالي */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pl-1 pr-1">
                  {filteredBubbles?.map((bubble: any, bIdx: number) => (
                    <div
                      key={bubble.id || bIdx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 shadow-inner hover:border-slate-700 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono text-slate-500 font-bold">#{bIdx + 1}</span>

                        <select
                          value={bubble.category || 'dialogue'}
                          onChange={(e) =>
                            onUpdateBubble(currentPage.id, bubble.id, bubble.translatedText, e.target.value)
                          }
                          className="bg-slate-900 border border-slate-700 text-orange-400 text-xs font-mono rounded-md px-2 py-1 outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {categories && categories.length > 0 ? (
                            categories.map((cat, catIdx) => {
                              const value = cat.id || cat.name || cat.value || `cat_${catIdx}`;
                              const name = cat.name || cat.label || value;
                              const tag = cat.prefix || cat.tag || '';
                              return (
                                <option key={value} value={value}>
                                  {name} {tag ? `(${tag})` : ''}
                                </option>
                              );
                            })
                          ) : (
                            <>
                              <option value="dialogue">dialogue (::"")</option>
                              <option value="sfx">sfx (SFX:)</option>
                              <option value="thought">thought (::THOUGHT:)</option>
                              <option value="system">system (::SYSTEM:)</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div className="text-xs text-slate-400 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed text-left" dir="ltr">
                        {bubble.originalText}
                      </div>

                      <textarea
                        value={bubble.translatedText}
                        onChange={(e) => onUpdateBubble(currentPage.id, bubble.id, e.target.value, bubble.category)}
                        rows={3}
                        dir="auto"
                        className="w-full p-2.5 border border-slate-700 rounded-lg bg-slate-900 text-slate-100 font-sans text-sm focus:ring-1 focus:ring-orange-500 outline-none resize-y leading-relaxed custom-scrollbar text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex gap-8 h-full min-h-0 overflow-y-auto custom-scrollbar shadow-xl">
              <div className="flex-1 flex justify-center items-start bg-slate-950 rounded-xl p-4 border border-slate-800">
                <img src={currentPage.imageUrl} alt="Preview" className="w-auto max-w-full object-contain rounded-lg shadow-2xl" />
              </div>
              <div className="w-[500px] space-y-4">
                <h3 className="font-bold text-base border-b border-slate-800 pb-3 text-orange-400">
                  النص النهائي الجاهز للتايبر (Page {activePageIndex + 1})
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {currentPage.bubbles?.map((b: any, idx: number) => (
                    <div key={b.id || idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 shadow-inner">
                      <div className="text-[10px] text-orange-400/80 font-bold">Bubble #{idx + 1} ({b.category || 'dialogue'})</div>
                      <div className="text-sm font-bold text-slate-100 leading-relaxed select-all" dir="auto">
                        {formatBubbleText(b)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};