import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { generateQuiz } from "@/lib/ai/quiz";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const document = await prisma.document.findFirst({
      where: { id, userId },
    });
    if (!document) throw new NotFoundError("Documento no encontrado");
    if (!document.extractedText) {
      return NextResponse.json(
        { error: "El documento todavía no tiene texto extraído." },
        { status: 400 },
      );
    }

    const questions = await generateQuiz(id);
    return NextResponse.json(questions);
  } catch (error) {
    return toErrorResponse(error);
  }
}
