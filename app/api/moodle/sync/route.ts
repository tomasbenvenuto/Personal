import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { runMoodleSync } from "@/lib/moodle-sync";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

// Allow extra time for a sync that downloads/extracts several new PDFs —
// Hobby plan's default function timeout (10s) is too short for that.
export const maxDuration = 60;

export async function POST() {
  try {
    const userId = await requireUserId();
    const account = await prisma.moodleAccount.findUnique({ where: { userId } });
    if (!account) {
      throw new NotFoundError("Todavía no conectaste tu aula virtual.");
    }

    const result = await runMoodleSync(userId);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
