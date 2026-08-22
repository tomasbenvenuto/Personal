import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ExamQuestion } from "@/lib/ai/exam";
import { ExamRunner } from "./ExamRunner";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const session = await auth();
  const { id, examId } = await params;

  const exam = await prisma.examSimulation.findFirst({
    where: { id: examId, documentId: id, document: { userId: session!.user.id } },
  });
  if (!exam) notFound();

  const attempts = await prisma.examAttempt.findMany({
    where: { examSimulationId: examId, userId: session!.user.id },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{exam.title}</h2>
        <Link
          href={`/documents/${id}/exam`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Simulacros
        </Link>
      </div>

      {attempts.length > 0 && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <p className="mb-1 font-medium">Intentos anteriores</p>
          <ul className="text-neutral-500">
            {attempts.map((a) => (
              <li key={a.id}>
                {a.submittedAt?.toLocaleString("es-AR")} —{" "}
                {Math.round(a.score ?? 0)}%
              </li>
            ))}
          </ul>
        </div>
      )}

      <ExamRunner
        examId={exam.id}
        questions={exam.questions as unknown as ExamQuestion[]}
      />
    </div>
  );
}
