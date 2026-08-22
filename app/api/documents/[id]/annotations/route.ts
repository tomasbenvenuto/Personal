import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const bodySchema = z.object({
  pageNumber: z.number().int().min(1),
  highlightRects: z.array(rectSchema).min(1),
  selectedText: z.string().min(1).max(5000),
  note: z.string().max(5000).optional(),
  color: z.string().max(20).optional(),
});

async function requireOwnedDocument(id: string, userId: string) {
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
    await requireOwnedDocument(id, userId);

    const annotations = await prisma.annotation.findMany({
      where: { documentId: id },
      orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(annotations);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await requireOwnedDocument(id, userId);
    const body = bodySchema.parse(await request.json());

    const annotation = await prisma.annotation.create({
      data: {
        documentId: id,
        pageNumber: body.pageNumber,
        highlightRects: body.highlightRects,
        selectedText: body.selectedText,
        note: body.note,
        color: body.color ?? "#ffe066",
      },
    });
    return NextResponse.json(annotation);
  } catch (error) {
    return toErrorResponse(error);
  }
}
