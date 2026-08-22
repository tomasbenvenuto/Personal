"use client";

import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Mi Estudio</h1>
          <p className="text-sm text-neutral-500">Acceso privado</p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
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
            disabled={loading}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">o</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Continuar con Google
        </button>
      </div>
    </main>
  );
}
