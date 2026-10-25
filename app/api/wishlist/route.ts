import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validateWishlistInput } from "@/lib/wishlist-validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const requests = await prisma.wishlistRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        description: true,
        userId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      requests.map(({ userId, ...request }) => ({
        ...request,
        canReceiveInquiries: userId !== null,
      })),
    );
  } catch (error) {
    console.error("Failed to load wishlist requests:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить заявки. Попробуйте обновить страницу." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите через Google, чтобы оставить заявку." },
      { status: 401 },
    );
  }
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать форму. Проверьте отправленные данные." },
      { status: 400 },
    );
  }

  const result = validateWishlistInput(body);

  if (!result.data) {
    return NextResponse.json(
      { error: "Проверьте поля формы.", fieldErrors: result.errors },
      { status: 400 },
    );
  }

  try {
    const wishlistRequest = await prisma.wishlistRequest.create({
      data: { ...result.data, contactInfo: null, userId: session.user.id },
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        description: true,
        userId: true,
        createdAt: true,
      },
    });
    const { userId, ...publicRequest } = wishlistRequest;
    return NextResponse.json(
      { ...publicRequest, canReceiveInquiries: userId !== null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create wishlist request:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить заявку. Проверьте подключение к базе данных." },
      { status: 503 },
    );
  }
}
