import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewSession } from "./ReviewSession";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const session = await auth();
  const { documentId } = await searchParams;

  const cards = await prisma.flashcard.findMany({
    where: {
      userId: session!.user.id,
      dueDate: { lte: new Date() },
      ...(documentId ? { documentId } : {}),
    },
    orderBy: { dueDate: "asc" },
    include: { document: { select: { title: true } } },
  });

  const items = cards.map((card) => ({
    id: card.id,
    question: card.question,
    answer: card.answer,
    documentTitle: card.document.title,
  }));

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Repaso</h1>
        <Link
          href="/dashboard"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Biblioteca
        </Link>
      </div>
      <ReviewSession initialCards={items} />
    </main>
  );
}
