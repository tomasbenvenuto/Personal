import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { sm2 } from "@/lib/sm2";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({ quality: z.number().int().min(0).max(5) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const { quality } = bodySchema.parse(await request.json());

    const card = await prisma.flashcard.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundError("Flashcard no encontrada");

    const result = sm2(
      {
        easeFactor: card.easeFactor,
        interval: card.interval,
        repetitions: card.repetitions,
      },
      quality,
    );

    const updated = await prisma.flashcard.update({
      where: { id },
      data: {
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        dueDate: result.dueDate,
        lastReviewedAt: new Date(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
