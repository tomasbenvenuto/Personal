"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Account = {
  username: string;
  baseUrl: string;
  lastSyncedAt: string | null;
  lastSyncStatus: "NEVER_SYNCED" | "SYNCING" | "SUCCESS" | "PARTIAL" | "FAILED";
  lastSyncMessage: string | null;
  courses: { id: string; fullName: string; documentCount: number; eventCount: number }[];
};

const STATUS_LABEL: Record<Account["lastSyncStatus"], string> = {
  NEVER_SYNCED: "Todavía no sincronizaste",
  SYNCING: "Sincronizando…",
  SUCCESS: "Última sincronización OK",
  PARTIAL: "Última sincronización con avisos",
  FAILED: "Última sincronización falló",
};

export function MoodleConnectionPanel({ account }: { account: Account | null }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moodle/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo conectar.");
      }
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moodle/sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo sincronizar.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("¿Desconectar tu aula virtual? Los PDFs ya importados no se borran.")) {
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/moodle/connect", { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <form onSubmit={handleConnect} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm text-neutral-500">
          Conectá tu usuario y contraseña de{" "}
          <span className="font-medium">aulavirtual.instituto.ort.edu.ar</span> para
          traer automáticamente los PDFs y las fechas de tus materias. Se
          guardan cifrados y solo se usan para conectarse al aula virtual.
        </p>
        <div className="space-y-1">
          <label htmlFor="moodle-username" className="text-sm font-medium">
            Usuario
          </label>
          <input
            id="moodle-username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="moodle-password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="moodle-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? "Conectando…" : "Conectar"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <p className="text-sm font-medium">Conectado como {account.username}</p>
        <p className="text-xs text-neutral-500">{account.baseUrl}</p>
        <p className="mt-3 text-xs text-neutral-500">
          {STATUS_LABEL[account.lastSyncStatus]}
          {account.lastSyncedAt &&
            ` · ${new Date(account.lastSyncedAt).toLocaleString("es-AR")}`}
        </p>
        {account.lastSyncMessage && (
          <p className="mt-1 text-xs text-neutral-400">{account.lastSyncMessage}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Sincronizando…" : "Sincronizar ahora"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            Desconectar
          </button>
        </div>
      </div>

      {account.courses.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <p className="mb-3 text-sm font-medium">Materias</p>
          <ul className="space-y-2 text-sm">
            {account.courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span>{c.fullName}</span>
                <span className="text-xs text-neutral-400">
                  {c.documentCount} PDF · {c.eventCount} fechas
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
