import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GenerateButton } from "../GenerateButton";

export default async function FlashcardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cards = await prisma.flashcard.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Flashcards</h2>
        <div className="flex items-center gap-3">
          {cards.length > 0 && (
            <Link
              href={`/review?documentId=${id}`}
              className="text-sm text-neutral-600 underline hover:text-neutral-900"
            >
              Repasar estas ({cards.length})
            </Link>
          )}
          <GenerateButton
            endpoint={`/api/documents/${id}/generate-flashcards`}
            label="Generar flashcards"
            regenerateLabel="Generar más"
            hasContent={cards.length > 0}
          />
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no generaste flashcards para este documento.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards.map((card) => (
            <li
              key={card.id}
              className="rounded-lg border border-neutral-200 bg-white p-4"
            >
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  {card.question}
                </summary>
                <p className="mt-2 text-sm text-neutral-600">{card.answer}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
