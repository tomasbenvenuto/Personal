import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "@/lib/generated/prisma/client";

// Neon's serverless driver needs a WebSocket implementation outside the
// browser/edge runtime (Node.js doesn't ship one globally).
neonConfig.webSocketConstructor = ws;

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient();
  }
  return globalThis.__prisma;
}

// A lazy proxy, not a real client built at module-load time: Next.js's
// build step imports every route module (even fully dynamic ones) to
// collect metadata, so constructing the client eagerly here would crash
// `next build` on any environment where DATABASE_URL isn't set yet at
// build time (e.g. a Vercel project before its env vars are configured).
// Deferring the actual connection until a property is first accessed means
// a missing DATABASE_URL only breaks requests that actually touch the DB,
// not the build itself.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient() as object, prop, receiver);
  },
});
