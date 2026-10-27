"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DocumentListItem = {
  id: string;
  title: string;
  status: "UPLOADED" | "EXTRACTING" | "READY" | "FAILED";
  source: "MANUAL" | "MOODLE_SYNC";
  pageCount: number | null;
  fileSizeBytes: number;
  createdAt: string;
  course: { fullName: string } | null;
};

const STATUS_LABEL: Record<DocumentListItem["status"], string> = {
  UPLOADED: "Subido",
  EXTRACTING: "Procesando…",
  READY: "Listo",
  FAILED: "Error al procesar",
};

const STATUS_CLASS: Record<DocumentListItem["status"], string> = {
  UPLOADED: "bg-neutral-100 text-neutral-600",
  EXTRACTING: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DocumentCard({ document }: { document: DocumentListItem }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`¿Borrar "${document.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo borrar el documento.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al borrar.");
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/documents/${document.id}`}
      className="group relative flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium">{document.title}</h3>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 rounded p-1 text-neutral-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-50"
          aria-label="Borrar"
          title="Borrar"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${STATUS_CLASS[document.status]}`}
        >
          {STATUS_LABEL[document.status]}
        </span>
        {document.pageCount != null && <span>{document.pageCount} pág.</span>}
        <span>{formatSize(document.fileSizeBytes)}</span>
        {document.source === "MOODLE_SYNC" && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Aula virtual
          </span>
        )}
      </div>

      {document.course && (
        <p className="truncate text-xs text-neutral-400">
          {document.course.fullName}
        </p>
      )}
    </Link>
  );
}
