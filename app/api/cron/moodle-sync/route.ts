import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMoodleSync } from "@/lib/moodle-sync";

// Vercel Cron hits this once a day (see vercel.json). Allow extra time for
// a sync that downloads/extracts several new PDFs — Hobby plan's default
// function timeout (10s) is too short for that.
export const maxDuration = 60;

/**
 * Cron-triggered sync — no browser session, so it's authenticated via
 * CRON_SECRET instead of a login cookie. Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` on scheduled invocations once that
 * env var is set (see README). Single-user app, so there's exactly one
 * MoodleAccount to sync, if the owner has connected one yet.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const account = await prisma.moodleAccount.findFirst();
  if (!account) {
    return NextResponse.json({ skipped: "Aún no hay una cuenta de aula virtual conectada." });
  }

  try {
    const result = await runMoodleSync(account.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron Moodle sync failed:", error);
    // Still 200: the error is already recorded on MoodleAccount.lastSyncStatus,
    // and Vercel would otherwise flag every transient Moodle hiccup as a
    // failed cron run.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 200 },
    );
  }
}
