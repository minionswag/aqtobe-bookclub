import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateWishlistInput } from "@/lib/wishlist-validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите в аккаунт, чтобы редактировать заявку." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать форму редактирования." }, { status: 400 });
  }

  const validation = validateWishlistInput(body);
  if (!validation.data) {
    return NextResponse.json(
      { error: "Проверьте поля формы.", fieldErrors: validation.errors },
      { status: 400 },
    );
  }

  try {
    const updatedCount = await prisma.wishlistRequest.updateMany({
      where: { id, userId: session.user.id },
      data: validation.data,
    });

    if (updatedCount.count === 0) {
      return NextResponse.json(
        { error: "Заявка не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    const request = await prisma.wishlistRequest.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        description: true,
        createdAt: true,
        userId: true,
      },
    });
    const { userId, ...publicRequest } = request;
    return NextResponse.json({ ...publicRequest, canReceiveInquiries: userId !== null });
  } catch (error) {
    console.error("Failed to update owned wishlist request:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить заявку. Попробуйте снова." },
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
    const result = await prisma.wishlistRequest.deleteMany({
      where: { id, userId: session.user.id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Заявка не найдена или опубликована другим пользователем." },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete owned wishlist request:", error);
    return NextResponse.json(
      { error: "Не удалось удалить заявку. Попробуйте снова." },
      { status: 503 },
    );
  }
}
