"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Shared "Generate" / "Regenerate" button for every AI feature tab
 *  (summary, concept map, flashcards, quiz, exam). POSTs to the given
 *  endpoint (adding ?force=true when content already exists, so the
 *  server skips its cache) and refreshes the server-rendered page on
 *  success so the new content shows up. */
export function GenerateButton({
  endpoint,
  label,
  regenerateLabel = "Regenerar",
  hasContent,
}: {
  endpoint: string;
  label: string;
  regenerateLabel?: string;
  hasContent: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      const url = hasContent ? `${endpoint}?force=true` : endpoint;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Error al generar.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? "Generando…" : hasContent ? regenerateLabel : label}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
