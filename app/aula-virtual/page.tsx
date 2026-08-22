import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MoodleConnectionPanel } from "./MoodleConnectionPanel";

export default async function AulaVirtualPage() {
  const session = await auth();
  const userId = session!.user.id;

  const account = await prisma.moodleAccount.findUnique({
    where: { userId },
    include: {
      courses: {
        include: { _count: { select: { documents: true, events: true } } },
        orderBy: { fullName: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Aula virtual</h1>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Biblioteca
        </Link>
      </div>

      <MoodleConnectionPanel
        account={
          account
            ? {
                username: account.username,
                baseUrl: account.baseUrl,
                lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
                lastSyncStatus: account.lastSyncStatus,
                lastSyncMessage: account.lastSyncMessage,
                courses: account.courses.map((c) => ({
                  id: c.id,
                  fullName: c.fullName,
                  documentCount: c._count.documents,
                  eventCount: c._count.events,
                })),
              }
            : null
        }
      />
    </main>
  );
}
