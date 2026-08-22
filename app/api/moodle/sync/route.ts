import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { runMoodleSync } from "@/lib/moodle-sync";
import { NotFoundError, toErrorResponse } from "@/lib/api-utils";

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
