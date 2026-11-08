import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ bookIds: [] });

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: {
      bookId: true,
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          category: true,
          district: true,
          imageUrl: true,
          dealType: true,
          price: true,
          isFound: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    bookIds: favorites.map(({ bookId }) => bookId),
    books: favorites.map(({ book }) => book),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Войдите, чтобы сохранять книги." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const bookId =
    typeof body === "object" && body !== null && "bookId" in body && typeof body.bookId === "string"
      ? body.bookId.trim()
      : "";
  if (!bookId || bookId.length > 100) return NextResponse.json({ error: "Книга не указана." }, { status: 400 });

  try {
    const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) return NextResponse.json({ error: "Книга не найдена." }, { status: 404 });
    const existing = await prisma.favorite.findUnique({
      where: { userId_bookId: { userId: session.user.id, bookId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorite: false });
    }
    await prisma.favorite.create({ data: { userId: session.user.id, bookId } });
    return NextResponse.json({ favorite: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return NextResponse.json({ error: "Не удалось изменить избранное." }, { status: 503 });
  }
}
