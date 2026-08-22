import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { extractDocumentText } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({
  storageKey: z.string().min(1),
  title: z.string().min(1).max(300),
  originalName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = bodySchema.parse(await request.json());

    const document = await prisma.document.create({
      data: {
        userId,
        title: body.title,
        originalName: body.originalName,
        storageKey: body.storageKey,
        fileSizeBytes: body.fileSizeBytes,
        status: "UPLOADED",
        source: "MANUAL",
      },
    });

    // Extraction happens inline (no queue) — fine for a single-user app
    // processing one document at a time. It updates the row itself, so
    // even if it fails the client just sees status: FAILED below.
    await extractDocumentText(document.id);

    const refreshed = await prisma.document.findUnique({
      where: { id: document.id },
    });
    return NextResponse.json(refreshed);
  } catch (error) {
    return toErrorResponse(error);
  }
}
