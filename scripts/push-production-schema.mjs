import { spawnSync } from "node:child_process";
import path from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const targetDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;
if (!targetDatabaseUrl || !/^postgres(?:ql)?:\/\//i.test(targetDatabaseUrl)) {
  throw new Error("Set PRODUCTION_DATABASE_URL to a PostgreSQL connection string before syncing production.");
}

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const result = spawnSync(
  process.execPath,
  [prismaCli, "db", "push", "--schema", "prisma/schema.prisma"],
  {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: targetDatabaseUrl },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exitCode = result.status ?? 1;
