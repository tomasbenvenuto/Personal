"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Visor" },
  { slug: "summary", label: "Resumen" },
  { slug: "concept-map", label: "Mapa conceptual" },
  { slug: "flashcards", label: "Flashcards" },
  { slug: "quiz", label: "Quiz" },
  { slug: "exam", label: "Examen" },
];

export function DocumentTabs({ documentId }: { documentId: string }) {
  const pathname = usePathname();
  const base = `/documents/${documentId}`;

  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`rounded-md px-2.5 py-1 ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
