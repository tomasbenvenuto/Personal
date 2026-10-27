import { auth } from "@/lib/auth";

/** Resolves the current session's user id, or throws a tagged error the
 *  route handlers below turn into a 401. Single-user app, but every table
 *  is still keyed by userId so this stays the one place that decides
 *  "who is asking". */
export class UnauthorizedError extends Error {}

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError("No autenticado");
  return userId;
}
