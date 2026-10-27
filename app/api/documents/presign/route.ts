import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { buildStorageKey } from "@/lib/documents";
import { presignUploadUrl } from "@/lib/r2";
import { toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({
  originalName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = bodySchema.parse(await request.json());

    if (body.contentType !== "application/pdf") {
      return NextResponse.json(
        { error: "Solo se aceptan archivos PDF" },
        { status: 400 },
      );
    }

    const storageKey = buildStorageKey(userId, body.originalName);
    const uploadUrl = await presignUploadUrl(storageKey, body.contentType);

    return NextResponse.json({ storageKey, uploadUrl });
  } catch (error) {
    return toErrorResponse(error);
  }
}
