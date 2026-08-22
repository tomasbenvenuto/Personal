import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentTabs } from "./DocumentTabs";

export default async function DocumentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!document) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/dashboard"
              className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900"
            >
              ← Biblioteca
            </Link>
            <h1 className="truncate text-sm font-medium">{document.title}</h1>
          </div>
          <DocumentTabs documentId={id} />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
