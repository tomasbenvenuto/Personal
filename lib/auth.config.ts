import type { NextAuthConfig } from "next-auth";

// Edge-safe subset of the auth config: no Prisma adapter, no bcrypt, no
// providers that need Node APIs. This is what middleware.ts runs on the
// Edge runtime; the full config (lib/auth.ts) extends this for route
// handlers and server components, which run on the Node runtime.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname === "/login";

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
