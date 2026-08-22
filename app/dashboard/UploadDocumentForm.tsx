"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UploadDocumentForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Solo se aceptan archivos PDF.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      setStatusText("Preparando subida...");
      const presignRes = await fetch("/api/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalName: file.name,
          contentType: file.type,
        }),
      });
      if (!presignRes.ok) throw new Error("No se pudo preparar la subida.");
      const { storageKey, uploadUrl } = await presignRes.json();

      setStatusText("Subiendo archivo...");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Falló la subida del archivo.");

      setStatusText("Procesando PDF (extrayendo texto)...");
      const finalizeRes = await fetch("/api/documents/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          title: file.name.replace(/\.pdf$/i, ""),
          originalName: file.name,
          fileSizeBytes: file.size,
        }),
      });
      if (!finalizeRes.ok) throw new Error("No se pudo procesar el PDF.");

      setStatusText(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el PDF.");
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? statusText ?? "Subiendo..." : "Subir PDF"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
