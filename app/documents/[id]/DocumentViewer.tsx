"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Load the pdf.js worker from a CDN matching react-pdf's exact bundled
// pdfjs-dist version, so we don't have to fight the bundler over worker
// asset resolution.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PAGE_WIDTH = 760;

type Rect = { x: number; y: number; width: number; height: number };

type AnnotationDTO = {
  id: string;
  pageNumber: number;
  highlightRects: Rect[];
  selectedText: string;
  note: string | null;
  color: string;
};

type PendingSelection = {
  pageNumber: number;
  rects: Rect[];
  selectedText: string;
  anchor: { top: number; left: number };
};

export function DocumentViewer({ documentId }: { documentId: string }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationDTO[]>([]);
  const [pageSizes, setPageSizes] = useState<
    Record<number, { width: number; height: number }>
  >({});
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [openAnnotationId, setOpenAnnotationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [fileRes, annRes] = await Promise.all([
          fetch(`/api/documents/${documentId}/file`),
          fetch(`/api/documents/${documentId}/annotations`),
        ]);
        if (!fileRes.ok) throw new Error("No se pudo cargar el PDF.");
        const { url } = await fileRes.json();
        const anns = annRes.ok ? await annRes.json() : [];
        if (!cancelled) {
          setFileUrl(url);
          setAnnotations(anns);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar.");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const annotationsByPage = useMemo(() => {
    const map = new Map<number, AnnotationDTO[]>();
    for (const ann of annotations) {
      const list = map.get(ann.pageNumber) ?? [];
      list.push(ann);
      map.set(ann.pageNumber, list);
    }
    return map;
  }, [annotations]);

  const handleRenderSuccess = useCallback((pageNumber: number) => {
    const el = pageRefs.current.get(pageNumber);
    if (el) {
      setPageSizes((prev) => ({
        ...prev,
        [pageNumber]: { width: el.clientWidth, height: el.clientHeight },
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }
    const text = selection.toString().trim();
    if (!text) return;

    const anchorNode = selection.anchorNode;
    let pageNumber: number | null = null;
    let pageEl: HTMLDivElement | null = null;
    for (const [num, el] of pageRefs.current.entries()) {
      if (anchorNode && el.contains(anchorNode)) {
        pageNumber = num;
        pageEl = el;
        break;
      }
    }
    if (!pageNumber || !pageEl) return;

    const containerRect = pageEl.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return;

    const rects: Rect[] = clientRects.map((r) => ({
      x: (r.left - containerRect.left) / containerRect.width,
      y: (r.top - containerRect.top) / containerRect.height,
      width: r.width / containerRect.width,
      height: r.height / containerRect.height,
    }));

    const boundingRect = range.getBoundingClientRect();
    setPending({
      pageNumber,
      rects,
      selectedText: text,
      anchor: { top: boundingRect.bottom + 8, left: boundingRect.left },
    });
    setNoteDraft("");
  }, []);

  useEffect(() => {
    function dismissOnScroll() {
      setPending(null);
    }
    window.addEventListener("scroll", dismissOnScroll, true);
    return () => window.removeEventListener("scroll", dismissOnScroll, true);
  }, []);

  async function saveHighlight() {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: pending.pageNumber,
          highlightRects: pending.rects,
          selectedText: pending.selectedText,
          note: noteDraft.trim() ? noteDraft.trim() : undefined,
        }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el resaltado.");
      const created: AnnotationDTO = await res.json();
      setAnnotations((prev) => [...prev, created]);
      window.getSelection()?.removeAllRanges();
      setPending(null);
      setNoteDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnotation(id: string) {
    try {
      const res = await fetch(
        `/api/documents/${documentId}/annotations/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("No se pudo borrar la anotación.");
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setOpenAnnotationId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al borrar.");
    }
  }

  if (error) {
    return <p className="p-8 text-sm text-red-600">{error}</p>;
  }

  return (
    <div ref={containerRef} className="relative mx-auto max-w-4xl p-4 sm:p-8">
      {!fileUrl && <p className="text-sm text-neutral-500">Cargando PDF…</p>}
      {fileUrl && (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError("No se pudo abrir el PDF.")}
          loading={<p className="text-sm text-neutral-500">Cargando PDF…</p>}
        >
          <div onMouseUp={handleMouseUp} className="flex flex-col items-center gap-6">
            {Array.from({ length: numPages ?? 0 }, (_, i) => i + 1).map(
              (pageNumber) => {
                const size = pageSizes[pageNumber];
                const pageAnnotations = annotationsByPage.get(pageNumber) ?? [];
                return (
                  <div
                    key={pageNumber}
                    ref={(el) => {
                      if (el) pageRefs.current.set(pageNumber, el);
                    }}
                    className="relative shadow-sm"
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={PAGE_WIDTH}
                      onRenderSuccess={() => handleRenderSuccess(pageNumber)}
                    />
                    {size &&
                      pageAnnotations.map((ann) =>
                        ann.highlightRects.map((rect, i) => (
                          <button
                            key={`${ann.id}-${i}`}
                            type="button"
                            onClick={() =>
                              setOpenAnnotationId(
                                openAnnotationId === ann.id ? null : ann.id,
                              )
                            }
                            style={{
                              position: "absolute",
                              left: rect.x * size.width,
                              top: rect.y * size.height,
                              width: rect.width * size.width,
                              height: rect.height * size.height,
                              backgroundColor: ann.color,
                              opacity: 0.35,
                              mixBlendMode: "multiply",
                            }}
                            className="cursor-pointer border-0 p-0"
                            aria-label="Ver anotación"
                          />
                        )),
                      )}
                    {openAnnotationId &&
                      pageAnnotations
                        .filter((a) => a.id === openAnnotationId)
                        .map((ann) => (
                          <div
                            key={ann.id}
                            className="absolute z-20 w-64 rounded-md border border-neutral-200 bg-white p-3 text-xs shadow-lg"
                            style={{
                              left: Math.min(
                                (ann.highlightRects[0]?.x ?? 0) * (size?.width ?? 0),
                                (size?.width ?? PAGE_WIDTH) - 260,
                              ),
                              top:
                                (ann.highlightRects[0]?.y ?? 0) * (size?.height ?? 0) +
                                20,
                            }}
                          >
                            <p className="mb-2 line-clamp-3 text-neutral-500 italic">
                              “{ann.selectedText}”
                            </p>
                            {ann.note && (
                              <p className="mb-2 whitespace-pre-wrap">{ann.note}</p>
                            )}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenAnnotationId(null)}
                                className="text-neutral-400 hover:text-neutral-700"
                              >
                                Cerrar
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAnnotation(ann.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                Borrar
                              </button>
                            </div>
                          </div>
                        ))}
                  </div>
                );
              },
            )}
          </div>
        </Document>
      )}

      {pending && (
        <div
          className="fixed z-30 w-72 rounded-md border border-neutral-200 bg-white p-3 shadow-lg"
          style={{ top: pending.anchor.top, left: pending.anchor.left }}
        >
          <p className="mb-2 line-clamp-2 text-xs text-neutral-500 italic">
            “{pending.selectedText}”
          </p>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Nota (opcional)"
            rows={2}
            className="mb-2 w-full rounded border border-neutral-300 p-1.5 text-xs focus:border-neutral-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-2 py-1 text-neutral-500 hover:text-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveHighlight}
              className="rounded bg-neutral-900 px-3 py-1 font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Resaltar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
