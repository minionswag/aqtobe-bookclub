import { PrismaClient } from "@prisma/client";
import { PrismaClient as SqliteClient } from "@aqtobe/prisma-sqlite";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const databaseProvider =
  process.env.DATABASE_PROVIDER ??
  (process.env.DATABASE_URL?.startsWith("file:")
    ? "sqlite"
    : process.env.NODE_ENV === "production"
      ? "postgres"
      : "sqlite");

if (databaseProvider !== "sqlite" && databaseProvider !== "postgres") {
  throw new Error("DATABASE_PROVIDER must be either sqlite or postgres.");
}

const createPrismaClient = (): PrismaClient => {
  if (databaseProvider === "postgres") {
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return new SqliteClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }) as unknown as PrismaClient; // Both generated clients use the same models; only their datasource providers differ.
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
