import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer } from "@/lib/r2";

/** Object key under which a user's PDF is stored in R2. */
export function buildStorageKey(userId: string, originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return `documents/${userId}/${randomUUID()}-${safeName}`;
}

/**
 * Downloads the PDF from R2, extracts its text with pdf-parse, and saves
 * the result on the Document row. Shared by the manual upload flow
 * (app/api/documents/finalize) and the Moodle sync flow
 * (lib/moodle-sync.ts) — both just need a Document row with a storageKey
 * already sitting in R2.
 */
export async function extractDocumentText(documentId: string) {
  await prisma.document.update({
    where: { id: documentId },
    data: { status: "EXTRACTING" },
  });

  try {
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });
    const buffer = await getObjectBuffer(document.storageKey);

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText: result.text,
        pageCount: result.total,
        status: "READY",
        failureReason: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", failureReason: message.slice(0, 500) },
    });
  }
}
