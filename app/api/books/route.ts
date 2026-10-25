import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookImageError, removeBookImage, saveBookImage } from "@/lib/book-image";
import { validateBookInput } from "@/lib/book-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        condition: true,
        dealType: true,
        price: true,
        district: true,
        imageUrl: true,
        isFound: true,
        userId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      books.map(({ userId, ...book }) => ({
        ...book,
        canReceiveInquiries: userId !== null,
      })),
    );
  } catch (error) {
    console.error("Failed to load book listings:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить книги. Попробуйте обновить страницу." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите через Google, чтобы разместить книгу." },
      { status: 401 },
    );
  }

  let formData: FormData;

  try {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024 + 64 * 1024) {
      return NextResponse.json(
        { error: "Размер изображения не должен превышать 5 МБ." },
        { status: 413 },
      );
    }
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать форму. Проверьте отправленные данные." },
      { status: 400 },
    );
  }

  const body = Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const result = validateBookInput(body);

  if (!result.data) {
    return NextResponse.json(
      { error: "Проверьте обязательные поля формы.", fieldErrors: result.errors },
      { status: 400 },
    );
  }

  let imageUrl: string | null;
  try {
    imageUrl = await saveBookImage(formData.get("image"));
  } catch (error) {
    if (error instanceof BookImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to save book image:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить изображение. Попробуйте ещё раз." },
      { status: 503 },
    );
  }

  try {
    const book = await prisma.book.create({
      data: { ...result.data, contactInfo: null, imageUrl, userId: session.user.id },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        condition: true,
        dealType: true,
        price: true,
        district: true,
        imageUrl: true,
        isFound: true,
        userId: true,
      },
    });
    const { userId, ...publicBook } = book;
    return NextResponse.json(
      { ...publicBook, canReceiveInquiries: userId !== null },
      { status: 201 },
    );
  } catch (error) {
    if (imageUrl) {
      try {
        await removeBookImage(imageUrl);
      } catch (cleanupError) {
        console.error("Failed to remove image for an unsaved book listing:", cleanupError);
      }
    }
    console.error("Failed to create book listing:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить объявление. Проверьте подключение к базе данных." },
      { status: 503 },
    );
  }
}
