import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

declare global {
  var __officePrisma: PrismaClient | undefined;
  var __officePrismaAdapter: PrismaPg | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter =
  global.__officePrismaAdapter ??
  new PrismaPg({
    connectionString,
  });

export const prisma =
  global.__officePrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__officePrismaAdapter = adapter;
  global.__officePrisma = prisma;
}
