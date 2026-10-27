import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/r2";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

async function findOwnedDocument(id: string, userId: string) {
  const document = await prisma.document.findFirst({ where: { id, userId } });
  if (!document) throw new NotFoundError("Documento no encontrado");
  return document;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const document = await findOwnedDocument(id, userId);
    return NextResponse.json(document);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const document = await findOwnedDocument(id, userId);

    await deleteObject(document.storageKey);
    await prisma.document.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
