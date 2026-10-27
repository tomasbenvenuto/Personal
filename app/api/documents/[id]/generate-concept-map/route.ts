import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { generateConceptMap } from "@/lib/ai/concept-map";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

export async function POST(
  request: Request,
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

    const force = new URL(request.url).searchParams.get("force") === "true";
    if (!force) {
      const existing = await prisma.conceptMap.findUnique({
        where: { documentId: id },
      });
      if (existing) return NextResponse.json(existing);
    }

    const conceptMap = await generateConceptMap(id);
    return NextResponse.json(conceptMap);
  } catch (error) {
    return toErrorResponse(error);
  }
}
