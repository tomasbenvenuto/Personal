import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getMoodleToken, getSiteInfo } from "@/lib/moodle";
import { toErrorResponse } from "@/lib/api-utils";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { username, password } = bodySchema.parse(await request.json());

    const baseUrl = process.env.MOODLE_BASE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "MOODLE_BASE_URL no está configurada en el servidor." },
        { status: 500 },
      );
    }

    // Validate the credentials before storing anything.
    const token = await getMoodleToken(baseUrl, username, password);
    const siteInfo = await getSiteInfo(baseUrl, token);

    const account = await prisma.moodleAccount.upsert({
      where: { userId },
      update: {
        baseUrl,
        username,
        encryptedPassword: encrypt(password),
        moodleUserId: siteInfo.userid,
        lastSyncStatus: "NEVER_SYNCED",
        lastSyncMessage: null,
      },
      create: {
        userId,
        baseUrl,
        username,
        encryptedPassword: encrypt(password),
        moodleUserId: siteInfo.userid,
      },
    });

    return NextResponse.json({
      id: account.id,
      username: account.username,
      baseUrl: account.baseUrl,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await prisma.moodleAccount.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
