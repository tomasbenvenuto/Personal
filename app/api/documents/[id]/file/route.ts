import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { presignGetUrl } from "@/lib/r2";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

export async function GET(
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

    const url = await presignGetUrl(document.storageKey);
    return NextResponse.json({ url });
  } catch (error) {
    return toErrorResponse(error);
  }
}
