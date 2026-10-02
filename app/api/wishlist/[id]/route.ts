import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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
