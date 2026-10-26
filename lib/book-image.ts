import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { databaseProvider } from "@/lib/prisma";
import { removeBookImageFromSupabase, uploadBookImageToSupabase } from "@/lib/supabase-storage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads");

export class BookImageError extends Error {}

function detectImageType(bytes: Buffer): { mimeType: string; extension: string } | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  return null;
}

export async function saveBookImage(value: FormDataEntryValue | null): Promise<string | null> {
  if (value === null) return null;
  if (typeof value === "string") {
    throw new BookImageError("Выберите файл изображения.");
  }
  if (value.size === 0) return null;
  if (value.size > MAX_IMAGE_SIZE) {
    throw new BookImageError("Размер изображения не должен превышать 5 МБ.");
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  const imageType = detectImageType(bytes);
  if (!imageType || value.type !== imageType.mimeType) {
    throw new BookImageError("Поддерживаются только корректные изображения JPG, PNG и WebP.");
  }

  const fileName = `${randomUUID()}.${imageType.extension}`;

  if (databaseProvider === "postgres") {
    return uploadBookImageToSupabase(fileName, bytes, imageType.mimeType);
  }

  await mkdir(UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(path.join(UPLOAD_DIRECTORY, fileName), bytes, { flag: "wx" });
  return `/uploads/${fileName}`;
}

export async function removeBookImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return;

  if (imageUrl.startsWith("https://")) {
    await removeBookImageFromSupabase(imageUrl);
    return;
  }

  if (!imageUrl.startsWith("/uploads/")) return;

  const fileName = imageUrl.slice("/uploads/".length);
  if (!/^[\da-f-]+\.(?:jpg|png|webp)$/i.test(fileName)) return;

  try {
    await unlink(path.join(UPLOAD_DIRECTORY, fileName));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}
