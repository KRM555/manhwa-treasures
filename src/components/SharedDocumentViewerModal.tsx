import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Copy, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/language";

export const SharedDocumentViewerModal: React.FC = () => {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [docData, setDocData] = useState<{
    id: string;
    author: string;
    createdAt?: string;
    html?: string;
    text?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get("view_doc");
    const author = urlParams.get("author") || "مترجم المانهوا";

    if (docId) {
      let saved = null;
      try {
        const raw = localStorage.getItem(`manga_doc_${docId}`);
        if (raw) saved = JSON.parse(raw);
      } catch {
        // ignore
      }

      setDocData(saved || { id: docId, author });
      setOpen(true);
    }
  }, []);

  if (!docData) return null;

  const handleCopyText = () => {
    if (docData.text) {
      navigator.clipboard.writeText(docData.text);
      toast.success(lang === "ar" ? "تم نسخ نص الترجمة" : "Text copied");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold">
                {lang === "ar" ? "مستند ترجمة مانهوا مشترك" : "Shared Translation Document"}
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  {docData.author}
                </span>
                <span>•</span>
                <span>
                  {docData.createdAt ? new Date(docData.createdAt).toLocaleDateString() : ""}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {docData.html ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: docData.html }}
            />
          ) : (
            <ScrollArea className="h-72 rounded-xl border border-border p-3 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{docData.text || "مستند الترجمة المعتمد"}</pre>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs rounded-xl"
          >
            {lang === "ar" ? "إغلاق" : "Close"}
          </Button>
          <Button
            size="sm"
            onClick={handleCopyText}
            className="text-xs font-bold rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "نسخ الترجمة" : "Copy Translation"}</span>
          </Button>
          <Button
            size="sm"
            onClick={() => window.open("https://docs.new", "_blank")}
            className="text-xs font-bold rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Google Docs</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
