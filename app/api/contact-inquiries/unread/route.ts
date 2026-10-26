import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите в аккаунт, чтобы проверить сообщения." }, { status: 401 });
  }

  const inquiryIds = [...new Set(new URL(request.url).searchParams.getAll("id"))];
  if (
    inquiryIds.length === 0 ||
    inquiryIds.length > 100 ||
    inquiryIds.some((id) => id.length === 0 || id.length > 100)
  ) {
    return NextResponse.json({ error: "Не удалось проверить список переписок." }, { status: 400 });
  }

  try {
    const inquiries = await prisma.contactInquiry.findMany({
      where: {
        id: { in: inquiryIds },
        OR: [{ senderId: session.user.id }, { recipientId: session.user.id }],
      },
      select: {
        id: true,
        senderId: true,
        createdAt: true,
        readStates: {
          where: { userId: session.user.id },
          select: { lastReadAt: true },
          take: 1,
        },
      },
    });

    const replyCounts = inquiries.length
      ? await prisma.inquiryMessage.groupBy({
          by: ["inquiryId"],
          where: {
            authorId: { not: session.user.id },
            OR: inquiries.map((inquiry) => ({
              inquiryId: inquiry.id,
              ...(inquiry.readStates[0]?.lastReadAt
                ? { createdAt: { gt: inquiry.readStates[0].lastReadAt } }
                : {}),
            })),
          },
          _count: { _all: true },
        })
      : [];
    const replyCountByInquiry = new Map(
      replyCounts.map((entry) => [entry.inquiryId, entry._count._all]),
    );
    const counts = inquiries.map((inquiry) => {
      const lastReadAt = inquiry.readStates[0]?.lastReadAt;
      const isInitialMessageUnread =
        inquiry.senderId !== session.user.id &&
        (!lastReadAt || inquiry.createdAt > lastReadAt);
      return [
        inquiry.id,
        (replyCountByInquiry.get(inquiry.id) ?? 0) + Number(isInitialMessageUnread),
      ] as const;
    });

    return NextResponse.json({
      counts: Object.fromEntries(counts),
    });
  } catch (error) {
    console.error("Failed to count unread contact inquiry messages:", error);
    return NextResponse.json(
      { error: "Не удалось обновить счётчик сообщений. Попробуйте снова." },
      { status: 503 },
    );
  }
}
