import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите в аккаунт, чтобы отправить отклик." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать сообщение." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Проверьте данные отклика." }, { status: 400 });
  }

  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
  const targetType = body.targetType;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (
    !targetId ||
    (targetType !== "book" && targetType !== "wishlist") ||
    message.length === 0 ||
    message.length > 1000 ||
    body.shareIdentity !== true
  ) {
    return NextResponse.json(
      { error: "Напишите сообщение до 1000 символов и подтвердите передачу имени и email владельцу." },
      { status: 400 },
    );
  }

  if (!session.user.email) {
    return NextResponse.json(
      { error: "В аккаунте не указан email — с ним владелец сможет ответить на сообщение." },
      { status: 400 },
    );
  }

  try {
    let recipientId: string | null;

    if (targetType === "book") {
      const book = await prisma.book.findUnique({
        where: { id: targetId },
        select: { userId: true, isFound: true },
      });
      if (!book?.userId) {
        return NextResponse.json(
          { error: "Автор этой публикации пока не может получать отклики через сайт." },
          { status: 404 },
        );
      }
      if (book.isFound) {
        return NextResponse.json(
          { error: "Эту книгу уже нашли, новые отклики не принимаются." },
          { status: 409 },
        );
      }
      recipientId = book.userId;
    } else {
      const wishlistRequest = await prisma.wishlistRequest.findUnique({
        where: { id: targetId },
        select: { userId: true },
      });
      recipientId = wishlistRequest?.userId ?? null;
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: "Автор этой публикации пока не может получать отклики через сайт." },
        { status: 404 },
      );
    }

    if (recipientId === session.user.id) {
      return NextResponse.json({ error: "Нельзя отправить отклик на свою публикацию." }, { status: 400 });
    }

    await prisma.contactInquiry.create({
      data: {
        bookId: targetType === "book" ? targetId : null,
        wishlistRequestId: targetType === "wishlist" ? targetId : null,
        senderId: session.user.id,
        recipientId,
        message,
      },
    });

    return NextResponse.json({ sent: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact inquiry:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить отклик. Попробуйте ещё раз." },
      { status: 503 },
    );
  }
}
