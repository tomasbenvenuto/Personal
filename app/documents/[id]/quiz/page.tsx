import { prisma } from "@/lib/prisma";
import { GenerateButton } from "../GenerateButton";
import { QuizRunner } from "./QuizRunner";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const questions = await prisma.quizQuestion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
  });

  const items = questions.map((q) => ({
    id: q.id,
    question: q.question,
    choices: q.choices as string[],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Quiz</h2>
        <GenerateButton
          endpoint={`/api/documents/${id}/generate-quiz`}
          label="Generar quiz"
          regenerateLabel="Generar otro"
          hasContent={items.length > 0}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no generaste un quiz para este documento.
        </p>
      ) : (
        <QuizRunner questions={items} />
      )}
    </div>
  );
}
