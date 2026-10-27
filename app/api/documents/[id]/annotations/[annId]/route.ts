import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({
  note: z.string().max(5000).nullable(),
});

async function requireOwnedAnnotation(
  documentId: string,
  annId: string,
  userId: string,
) {
  const annotation = await prisma.annotation.findFirst({
    where: { id: annId, documentId, document: { userId } },
  });
  if (!annotation) throw new NotFoundError("Anotación no encontrada");
  return annotation;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; annId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id, annId } = await params;
    await requireOwnedAnnotation(id, annId, userId);
    const body = bodySchema.parse(await request.json());

    const updated = await prisma.annotation.update({
      where: { id: annId },
      data: { note: body.note },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; annId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id, annId } = await params;
    await requireOwnedAnnotation(id, annId, userId);

    await prisma.annotation.delete({ where: { id: annId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
