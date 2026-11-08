import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ notifications: [], unread: 0 });
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, title: true, message: true, href: true, readAt: true, createdAt: true },
  });
  return NextResponse.json({
    notifications,
    unread: notifications.filter((notification) => !notification.readAt).length,
  });
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ read: true });
}
