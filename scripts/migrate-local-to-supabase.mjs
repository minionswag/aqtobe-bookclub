import nextEnv from "@next/env";
import { PrismaClient as PostgresClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient as SqliteClient } from "@aqtobe/prisma-sqlite";

nextEnv.loadEnvConfig(process.cwd());

const localDatabaseUrl = process.env.DATABASE_URL;
const targetDatabaseUrl = process.env.PRODUCTION_DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "book-photos";

if (!localDatabaseUrl?.startsWith("file:")) {
  throw new Error("DATABASE_URL must point to the local SQLite database for this migration.");
}
if (!targetDatabaseUrl || !/^postgres(?:ql)?:\/\//i.test(targetDatabaseUrl)) {
  throw new Error("Set PRODUCTION_DATABASE_URL to the Supabase PostgreSQL connection string.");
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local .env file.");
}

const projectUrl = new URL(supabaseUrl);
if (projectUrl.protocol !== "https:" || projectUrl.pathname !== "/" || projectUrl.search || projectUrl.hash) {
  throw new Error("SUPABASE_URL must be the HTTPS origin of your Supabase project.");
}

const local = new SqliteClient();
const production = new PostgresClient({ datasourceUrl: targetDatabaseUrl });
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

function storageUrl(pathname) {
  return `${projectUrl.origin}/storage/v1/${pathname}`;
}

async function uploadPhoto(fileName) {
  const localPath = path.join(process.cwd(), "public", "uploads", fileName);
  const bytes = await readFile(localPath);
  const extension = path.extname(fileName).toLowerCase();
  const mimeType =
    extension === ".jpg" ? "image/jpeg" : extension === ".png" ? "image/png" : "image/webp";
  const objectPath = `books/${fileName}`;
  const response = await fetch(
    storageUrl(`object/${encodeURIComponent(bucket)}/${objectPath}`),
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "true",
      },
      body: bytes,
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase photo upload failed with status ${response.status}.`);
  }

  return `${projectUrl.origin}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`;
}

async function verifyPublicBucket() {
  const response = await fetch(storageUrl(`bucket/${encodeURIComponent(bucket)}`), { headers });
  if (!response.ok) {
    throw new Error(
      `Could not verify the Supabase photo bucket (HTTP ${response.status}). Create the public "${bucket}" bucket first.`,
    );
  }

  const details = await response.json();
  if (typeof details !== "object" || details === null || details.public !== true) {
    throw new Error(`The Supabase storage bucket "${bucket}" must be public to display book photos.`);
  }
}

async function ensureEmptyProductionDatabase() {
  const [users, books, wishlistRequests, inquiries, messages, readStates] = await Promise.all([
    production.user.count(),
    production.book.count(),
    production.wishlistRequest.count(),
    production.contactInquiry.count(),
    production.inquiryMessage.count(),
    production.inquiryReadState.count(),
  ]);

  if (users + books + wishlistRequests + inquiries + messages + readStates > 0) {
    throw new Error(
      "The Supabase database is not empty. Migration stopped to avoid overwriting existing production data.",
    );
  }
}

async function migrate() {
  await verifyPublicBucket();
  await ensureEmptyProductionDatabase();

  const [users, accounts, books, wishlistRequests, inquiries, messages, readStates] =
    await Promise.all([
      local.user.findMany(),
      local.account.findMany(),
      local.book.findMany(),
      local.wishlistRequest.findMany(),
      local.contactInquiry.findMany(),
      local.inquiryMessage.findMany(),
      local.inquiryReadState.findMany(),
    ]);

  const booksWithCloudPhotos = await Promise.all(
    books.map(async (book) => {
      if (!book.imageUrl?.startsWith("/uploads/")) return book;

      const fileName = book.imageUrl.slice("/uploads/".length);
      if (!/^[\da-f-]+\.(?:jpg|png|webp)$/i.test(fileName)) {
        throw new Error(`A local book photo path is invalid for book ${book.id}.`);
      }

      return { ...book, imageUrl: await uploadPhoto(fileName) };
    }),
  );

  await production.$transaction(
    async (transaction) => {
      if (users.length) await transaction.user.createMany({ data: users });
      if (accounts.length) await transaction.account.createMany({ data: accounts });
      if (booksWithCloudPhotos.length) await transaction.book.createMany({ data: booksWithCloudPhotos });
      if (wishlistRequests.length) {
        await transaction.wishlistRequest.createMany({ data: wishlistRequests });
      }
      if (inquiries.length) await transaction.contactInquiry.createMany({ data: inquiries });
      if (messages.length) await transaction.inquiryMessage.createMany({ data: messages });
      if (readStates.length) await transaction.inquiryReadState.createMany({ data: readStates });
    },
    { maxWait: 10000, timeout: 60000 },
  );

  const photoCount = booksWithCloudPhotos.filter(
    (book, index) => book.imageUrl !== books[index].imageUrl,
  ).length;

  console.log(
    JSON.stringify({
      migratedUsers: users.length,
      migratedGoogleAccounts: accounts.length,
      migratedBooks: books.length,
      migratedWishlistRequests: wishlistRequests.length,
      migratedInquiries: inquiries.length,
      migratedConversationMessages: messages.length,
      migratedReadStates: readStates.length,
      migratedPhotos: photoCount,
      activeSessionsMigrated: 0,
    }),
  );
  console.log("Migration complete. Sign in again on the deployed site; local sessions were not copied.");
}

try {
  await migrate();
} finally {
  await Promise.all([local.$disconnect(), production.$disconnect()]);
}
