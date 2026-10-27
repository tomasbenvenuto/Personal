import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UploadDocumentForm } from "./UploadDocumentForm";
import { DocumentCard, type DocumentListItem } from "./DocumentCard";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { course: true },
  });

  const items: DocumentListItem[] = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    status: doc.status,
    source: doc.source,
    pageCount: doc.pageCount,
    fileSizeBytes: doc.fileSizeBytes,
    createdAt: doc.createdAt.toISOString(),
    course: doc.course ? { fullName: doc.course.fullName } : null,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-6 sm:p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Mi biblioteca</h1>
          <p className="text-sm text-neutral-500">
            {items.length} documento{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/review" className="text-neutral-600 hover:text-neutral-900">
            Repasar flashcards
          </Link>
          <Link href="/calendario" className="text-neutral-600 hover:text-neutral-900">
            Calendario
          </Link>
          <Link href="/aula-virtual" className="text-neutral-600 hover:text-neutral-900">
            Aula virtual
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-neutral-600 hover:text-neutral-900">
              Salir
            </button>
          </form>
        </nav>
      </header>

      <div className="mb-6">
        <UploadDocumentForm />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Todavía no subiste ningún PDF. Usá el botón de arriba, o conectá tu
          aula virtual para traerlos automáticamente.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </main>
  );
}
