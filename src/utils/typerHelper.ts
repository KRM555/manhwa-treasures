import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateTyperScript = (pages: any[]): string => {
  let script = '';

  pages.forEach((page, index) => {
    const pageName = page.fileName || page.name || `Page ${index + 1}`;
    const textItems = page.bubbles || page.items || [];

    script += `=== Page ${index + 1} (${pageName}) ===\n\n`;
    textItems.forEach((bubble: any) => {
      if (bubble.translatedText) {
        script += `${bubble.translatedText}\n`;
      }
    });
    script += '\n\n';
  });

  return script;
};

export const exportToTxt = (pages: any[]) => {
  const content = generateTyperScript(pages);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `Manga_Translation_Typer_${Date.now()}.txt`);
};

export const exportToWord = async (pages: any[]) => {
  const docChildren: Paragraph[] = [];

  pages.forEach((page, index) => {
    const pageName = page.fileName || page.name || `Page ${index + 1}`;
    const textItems = page.bubbles || page.items || [];

    docChildren.push(
      new Paragraph({
        text: `الصفحة ${index + 1} (${pageName})`,
        heading: HeadingLevel.HEADING_2,
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { before: 240, after: 120 },
      })
    );

    textItems.forEach((bubble: any) => {
      if (bubble.translatedText) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bubble.translatedText,
                size: 24,
              }),
            ],
            bidirectional: true,
            alignment: AlignmentType.RIGHT,
            spacing: { after: 100 },
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `Manga_Translation_${Date.now()}.docx`);
};