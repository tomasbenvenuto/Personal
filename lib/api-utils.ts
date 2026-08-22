import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/require-user";

/** Shared error → HTTP response mapping for API route handlers, so each
 *  route's catch block can just `return toErrorResponse(error)`. */
export function toErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  console.error(error);
  const message = error instanceof Error ? error.message : "Error interno";
  return NextResponse.json({ error: message }, { status: 500 });
}

export class NotFoundError extends Error {}
