import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TYPE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Entrega",
  QUIZ: "Parcial / Quiz",
  EVENT: "Evento",
};

const TYPE_CLASS: Record<string, string> = {
  ASSIGNMENT: "bg-blue-100 text-blue-700",
  QUIZ: "bg-red-100 text-red-700",
  EVENT: "bg-neutral-100 text-neutral-600",
};

export default async function CalendarioPage() {
  const session = await auth();

  const events = await prisma.courseEvent.findMany({
    where: { course: { moodleAccount: { userId: session!.user.id } } },
    include: { course: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendario</h1>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Biblioteca
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No hay fechas todavía. Conectá y sincronizá tu{" "}
          <Link href="/aula-virtual" className="underline">
            aula virtual
          </Link>{" "}
          para traerlas.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="truncate text-xs text-neutral-500">
                  {event.course.fullName}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CLASS[event.type]}`}
                >
                  {TYPE_LABEL[event.type]}
                </span>
                {event.dueDate && (
                  <span className="text-xs text-neutral-400">
                    {event.dueDate.toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
