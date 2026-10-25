import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { BookImageError, removeBookImage, saveBookImage } from "@/lib/book-image";
import { prisma } from "@/lib/prisma";
import { validateBookInput } from "@/lib/book-validation";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы менять статус книги." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму редактирования." }, { status: 400 });
  }

  const body = Object.fromEntries(
    [...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const validation = validateBookInput(body);
  if (!validation.data) {
    return NextResponse.json(
      { error: "Проверьте обязательные поля формы.", fieldErrors: validation.errors },
      { status: 400 },
    );
  }

  let imageUrl: string | null = null;
  try {
    imageUrl = await saveBookImage(formData.get("image"));
  } catch (error) {
    if (error instanceof BookImageError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to save replacement book image:", error);
    return NextResponse.json({ error: "Не удалось сохранить фотографию." }, { status: 503 });
  }

  try {
    const existingBook = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
      select: { imageUrl: true },
    });

    if (!existingBook) {
      if (imageUrl) await removeBookImage(imageUrl);
      return NextResponse.json(
        { error: "Книга не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        ...validation.data,
        ...(body.removeImage === "true" ? { imageUrl: null } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      },
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

    if (
      existingBook.imageUrl &&
      (imageUrl || body.removeImage === "true")
    ) {
      try {
        await removeBookImage(existingBook.imageUrl);
      } catch (error) {
        console.error("Failed to remove replaced book image:", error);
      }
    }

    const { userId, ...publicBook } = updatedBook;
    return NextResponse.json(
      { ...publicBook, canReceiveInquiries: userId !== null },
    );
  } catch (error) {
    if (imageUrl) {
      try {
        await removeBookImage(imageUrl);
      } catch (cleanupError) {
        console.error("Failed to remove image for an unsaved book edit:", cleanupError);
      }
    }
    console.error("Failed to update owned book listing status:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить изменения книги. Попробуйте снова." },
      { status: 503 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы менять статус книги." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать запрос." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.isFound !== "boolean") {
    return NextResponse.json({ error: "Укажите корректный статус книги." }, { status: 400 });
  }

  try {
    const result = await prisma.book.updateMany({
      where: { id, userId: session.user.id },
      data: { isFound: body.isFound },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Книга не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    return NextResponse.json({ isFound: body.isFound });
  } catch (error) {
    console.error("Failed to update owned book listing status:", error);
    return NextResponse.json(
      { error: "Не удалось изменить статус книги. Попробуйте снова." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите в аккаунт, чтобы управлять публикациями." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const book = await prisma.book.findFirst({
      where: { id, userId: session.user.id },
      select: { imageUrl: true },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Книга не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    const result = await prisma.book.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Книга не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    if (book.imageUrl) {
      try {
        await removeBookImage(book.imageUrl);
      } catch (error) {
        console.error("Failed to remove image for deleted book listing:", error);
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete owned book listing:", error);
    return NextResponse.json(
      { error: "Не удалось удалить объявление. Попробуйте снова." },
      { status: 503 },
    );
  }
}
