import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { gradeExamAttempt, type ExamQuestion } from "@/lib/ai/exam";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { examId } = await params;
    const { answers } = bodySchema.parse(await request.json());

    const exam = await prisma.examSimulation.findFirst({
      where: { id: examId, document: { userId } },
    });
    if (!exam) throw new NotFoundError("Simulacro no encontrado");

    const questions = exam.questions as unknown as ExamQuestion[];
    const { gradedDetail, score } = await gradeExamAttempt(questions, answers);

    const attempt = await prisma.examAttempt.create({
      data: {
        examSimulationId: exam.id,
        userId,
        answers,
        score,
        gradedDetail,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(attempt);
  } catch (error) {
    return toErrorResponse(error);
  }
}
