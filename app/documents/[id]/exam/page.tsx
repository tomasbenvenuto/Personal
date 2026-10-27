import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GenerateButton } from "../GenerateButton";

export default async function ExamListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exams = await prisma.examSimulation.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: { attempts: { orderBy: { submittedAt: "desc" }, take: 1 } },
  });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Simulacros de examen</h2>
        <GenerateButton
          endpoint={`/api/documents/${id}/generate-exam`}
          label="Generar simulacro"
          regenerateLabel="Generar otro"
          hasContent={exams.length > 0}
        />
      </div>

      {exams.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no generaste un simulacro para este documento.
        </p>
      ) : (
        <ul className="space-y-2">
          {exams.map((exam) => {
            const questions = exam.questions as unknown as { id: string }[];
            const lastAttempt = exam.attempts[0];
            return (
              <li key={exam.id}>
                <Link
                  href={`/documents/${id}/exam/${exam.id}`}
                  className="block rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
                >
                  <p className="text-sm font-medium">{exam.title}</p>
                  <p className="text-xs text-neutral-500">
                    {questions.length} preguntas
                    {lastAttempt &&
                      ` · último intento: ${Math.round(lastAttempt.score ?? 0)}%`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
