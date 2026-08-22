import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-utils";

export async function GET() {
  try {
    const userId = await requireUserId();
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { course: true },
    });
    return NextResponse.json(documents);
  } catch (error) {
    return toErrorResponse(error);
  }
}
