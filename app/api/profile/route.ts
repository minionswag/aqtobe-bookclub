import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) return NextResponse.json({ error: "Проверьте данные профиля." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const bio = typeof data.bio === "string" ? data.bio.trim() : "";
  const city = typeof data.city === "string" ? data.city.trim() : "";
  if (name.length > 80 || bio.length > 300 || city.length > 80) {
    return NextResponse.json({ error: "Проверьте длину полей профиля." }, { status: 400 });
  }
  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name || null, bio: bio || null, city: city || null },
      select: { name: true, bio: true, city: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Не удалось сохранить профиль." }, { status: 503 });
  }
}
