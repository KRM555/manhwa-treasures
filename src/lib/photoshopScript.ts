// Generator for Adobe Photoshop ExtendScript (.jsx)
// Allows Manga/Manhwa Scanlation Typers to automatically create text layers with Arabic translations and positions.

export interface PhotoshopScriptBubble {
  id: string;
  originalText: string;
  translatedText: string;
  category: string;
  topPercent?: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
}

export interface PhotoshopScriptPage {
  name: string;
  bubbles: PhotoshopScriptBubble[];
}

export function generatePhotoshopJsx(
  pages: PhotoshopScriptPage[],
  authorEmail: string = "مترجم المانهوا",
): string {
  const dateStr = new Date().toLocaleString("ar-EG");

  const sanitizedPages = pages.map((p) => ({
    name: p.name.replace(/"/g, '\\"'),
    bubbles: p.bubbles.map((b, i) => ({
      index: i + 1,
      category: (b.category || "حوار").replace(/"/g, '\\"'),
      text: (b.translatedText || "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\r"),
      top: typeof b.topPercent === "number" ? b.topPercent : (i + 1) * 8,
      left: typeof b.leftPercent === "number" ? b.leftPercent : 50,
      width: typeof b.widthPercent === "number" ? b.widthPercent : 30,
      height: typeof b.heightPercent === "number" ? b.heightPercent : 10,
    })),
  }));

  return `/**
 * =========================================================================
 * Manhwa TransTool Studio - سكريبت إدراج الترجمة الآلي في الفوتوشوب
 * المترجم / الحساب: ${authorEmail}
 * تاريخ الإنشاء: ${dateStr}
 * طريقة الاستخدام:
 * 1. افتح صفحة المانهوا في Adobe Photoshop
 * 2. اختر من القائمة: File > Scripts > Browse... (ملف > سكريبتات > استعراض)
 * 3. حدد هذا الملف (.jsx) وسيتم إنشاء مجلد طبقات النصوص وأماكنها تلقائياً!
 * =========================================================================
 */

#target photoshop

(function main() {
    if (app.documents.length === 0) {
        alert("تنبيه:\\nيرجى فتح صفحة المانهوا أولاً في الفوتوشوب قبل تشغيل السكريبت!");
        return;
    }

    var doc = app.activeDocument;
    var origRuler = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;

    var docWidth = doc.width.as("px");
    var docHeight = doc.height.as("px");

    // بيانات الصفحات وفقاعات النصوص
    var pagesData = ${JSON.stringify(sanitizedPages, null, 2)};

    // البحث عن الصفحة المطابقة لاسم المستند المفتوح أو استخدام الصفحة الأولى
    var activePageData = pagesData[0];
    for (var i = 0; i < pagesData.length; i++) {
        if (doc.name.indexOf(pagesData[i].name) !== -1 || pagesData[i].name.indexOf(doc.name) !== -1) {
            activePageData = pagesData[i];
            break;
        }
    }

    if (!activePageData || activePageData.bubbles.length === 0) {
        alert("لم يتم العثور على نصوص مترجمة لهذه الصفحة.");
        app.preferences.rulerUnits = origRuler;
        return;
    }

    // إنشاء مجلد مجموعة الطبقات
    var group = doc.layerSets.add();
    group.name = "ترجمة المانهوا - " + activePageData.name;

    var textColor = new SolidColor();
    textColor.rgb.red = 20;
    textColor.rgb.green = 20;
    textColor.rgb.blue = 20;

    var createdCount = 0;

    for (var b = activePageData.bubbles.length - 1; b >= 0; b--) {
        var item = activePageData.bubbles[b];
        if (!item.text || item.text.replace(/\\s+/g, "") === "") continue;

        try {
            var textLayer = group.artLayers.add();
            textLayer.kind = LayerKind.TEXT;
            textLayer.name = "#" + item.index + " [" + item.category + "] " + item.text.substring(0, 15);

            var textItem = textLayer.textItem;
            textItem.contents = item.text;
            textItem.color = textColor;
            textItem.justification = Justification.CENTER;

            // حساب حجم الخط التقديري المناسب
            var calcSize = Math.max(14, Math.min(32, Math.round(docWidth * 0.022)));
            textItem.size = new UnitValue(calcSize, "px");

            // حساب إحداثيات موضع الفقاعة
            var posX = (item.left / 100) * docWidth;
            var posY = (item.top / 100) * docHeight;

            // ضبط موضع النص في منتصف الفقاعة
            textItem.position = [new UnitValue(posX, "px"), new UnitValue(posY, "px")];

            createdCount++;
        } catch (err) {
            // الاستمرار في إنشاء باقي الطبقات في حال حدوث خطأ في طبقة واحدة
        }
    }

    app.preferences.rulerUnits = origRuler;

    alert("تم بنجاح! 👑\\nتم إنشاء " + createdCount + " طبقة نصية جاهزة للمانهوا داخل مجلد: " + group.name);
})();
`;
}

export function downloadPhotoshopJsx(
  pages: PhotoshopScriptPage[],
  fileName: string = "manhwa_translation_photoshop.jsx",
  authorEmail?: string,
): void {
  const jsxContent = generatePhotoshopJsx(pages, authorEmail);
  const blob = new Blob([jsxContent], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".jsx") ? fileName : `${fileName}.jsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
