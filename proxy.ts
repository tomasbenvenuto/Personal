import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Deliberately built from the edge-safe authConfig (no Prisma adapter) —
// the proxy runs on the Edge runtime, which can't load Prisma's client.
// (Next.js's build-time check for a valid proxy export only recognizes a
// plain `export const proxy = ...`, not a destructured one, so this stays
// split into two statements on purpose.)
const nextAuth = NextAuth(authConfig);
export const proxy = nextAuth.auth;

export const config = {
  // Protect everything except static assets and the NextAuth API routes
  // themselves (those need to stay reachable to complete sign-in).
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
