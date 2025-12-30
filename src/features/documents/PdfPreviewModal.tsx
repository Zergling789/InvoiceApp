import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from "lucide-react";

import { AppButton } from "@/ui/AppButton";
import { useToast } from "@/ui/FeedbackProvider";
import {
  isIosLikeDevice,
  openPdfInViewerIOS,
  triggerDownloadNonIOS,
} from "@/app/pdf/documentPdfService";

const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2;
const SCALE_STEP = 0.2;

const pdfWorkerSrc =
  typeof window === "undefined"
    ? ""
    : new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

if (pdfWorkerSrc && pdfjs.GlobalWorkerOptions.workerSrc !== pdfWorkerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

type PdfPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  blob: Blob | null;
  filename: string;
  loading: boolean;
  error: string | null;
};

export function PdfPreviewModal({
  isOpen,
  onClose,
  blob,
  filename,
  loading,
  error,
}: PdfPreviewModalProps) {
  const toast = useToast();
  const isIos = useMemo(() => isIosLikeDevice(), []);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPageNumber(1);
      setNumPages(null);
      setScale(DEFAULT_SCALE);
      setRenderError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!blob || !isOpen) return;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob, isOpen]);

  const handleLoadSuccess = (doc: PDFDocumentProxy) => {
    setNumPages(doc.numPages);
    setPageNumber(1);
    setRenderError(null);
  };

  const handleLoadError = (err: Error) => {
    console.error(err);
    setRenderError("PDF konnte nicht geladen werden.");
  };

  const handleDownload = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    triggerDownloadNonIOS(url, filename || "document.pdf");
  };

  const handleOpenViewer = () => {
    if (!objectUrl) return;
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Popup blockiert");
      return;
    }
    openPdfInViewerIOS(popup, objectUrl);
    toast.info("Im PDF-Viewer: Teilen → In Dateien sichern");
  };

  const canGoPrev = pageNumber > 1;
  const canGoNext = Boolean(numPages && pageNumber < numPages);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">PDF Vorschau</h3>
            {!isIos && numPages && (
              <p className="text-sm text-gray-500">
                Seite {pageNumber} von {numPages}
              </p>
            )}
          </div>
          <AppButton variant="ghost" onClick={onClose} aria-label="PDF Vorschau schließen">
            <X size={18} />
          </AppButton>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {loading && (
            <div className="flex h-full min-h-[200px] items-center justify-center text-gray-500">
              PDF wird geladen…
            </div>
          )}

          {!loading && (error || renderError) && (
            <div className="flex h-full min-h-[200px] items-center justify-center text-red-600">
              {error ?? renderError}
            </div>
          )}

          {!loading && !error && !renderError && isIos && (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 text-center">
              <p className="text-gray-600">
                PDF-Vorschau ist auf iOS/Safari nicht verfügbar. Öffne das Dokument im Viewer.
              </p>
              <AppButton onClick={handleOpenViewer} disabled={!objectUrl}>
                Im Viewer öffnen
              </AppButton>
            </div>
          )}

          {!loading && !error && !renderError && !isIos && objectUrl && (
            <div className="flex justify-center">
              <Document
                file={objectUrl}
                onLoadSuccess={handleLoadSuccess}
                onLoadError={handleLoadError}
                loading={null}
                error={null}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                />
              </Document>
            </div>
          )}
        </div>

        {!isIos && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <AppButton
                variant="secondary"
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={!canGoPrev}
              >
                <ChevronLeft size={16} /> Zurück
              </AppButton>
              <AppButton
                variant="secondary"
                onClick={() => setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev))}
                disabled={!canGoNext}
              >
                <ChevronRight size={16} /> Weiter
              </AppButton>
            </div>

            <div className="flex items-center gap-2">
              <AppButton
                variant="secondary"
                onClick={() => setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE))}
                disabled={scale <= MIN_SCALE}
              >
                <ZoomOut size={16} />
              </AppButton>
              <span className="min-w-[72px] text-center text-sm text-gray-600">
                {Math.round(scale * 100)}%
              </span>
              <AppButton
                variant="secondary"
                onClick={() => setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE))}
                disabled={scale >= MAX_SCALE}
              >
                <ZoomIn size={16} />
              </AppButton>
            </div>

            <AppButton variant="secondary" onClick={handleDownload} disabled={!blob}>
              <Download size={16} /> Download
            </AppButton>
          </div>
        )}
      </div>
    </div>
  );
}
