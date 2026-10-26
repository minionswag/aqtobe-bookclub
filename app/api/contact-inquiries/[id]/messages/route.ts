import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите в аккаунт, чтобы открыть переписку." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const inquiry = await prisma.contactInquiry.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        message: true,
        createdAt: true,
        sender: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
      },
    });

    if (!inquiry || ![inquiry.senderId, inquiry.recipientId].includes(session.user.id)) {
      return NextResponse.json({ error: "Переписка не найдена." }, { status: 404 });
    }

    const messages = [
      {
        id: inquiry.id,
        authorId: inquiry.senderId,
        authorName: inquiry.sender.name || "Читатель",
        content: inquiry.message,
        createdAt: inquiry.createdAt,
      },
      ...inquiry.messages.map((message) => ({
        id: message.id,
        authorId: message.authorId,
        authorName: message.author.name || "Читатель",
        content: message.content,
        createdAt: message.createdAt,
      })),
    ];

    const lastReadAt = messages.reduce(
      (latest, message) => (message.createdAt > latest ? message.createdAt : latest),
      messages[0].createdAt,
    );

    await prisma.inquiryReadState.upsert({
      where: {
        inquiryId_userId: {
          inquiryId: id,
          userId: session.user.id,
        },
      },
      create: {
        inquiryId: id,
        userId: session.user.id,
        lastReadAt,
      },
      update: { lastReadAt },
    });

    return NextResponse.json({
      messages: messages.map((message) => ({
        ...message,
        isMine: message.authorId === session.user.id,
      })),
    });
  } catch (error) {
    console.error("Failed to load contact inquiry conversation:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить переписку. Попробуйте снова." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Войдите в аккаунт, чтобы отправить сообщение." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать сообщение." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Проверьте текст сообщения." }, { status: 400 });
  }

  const content =
    "content" in body && typeof body.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 2000) {
    return NextResponse.json(
      { error: "Напишите сообщение длиной от 1 до 2000 символов." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const inquiry = await prisma.contactInquiry.findUnique({
      where: { id },
      select: { senderId: true, recipientId: true },
    });

    if (!inquiry || ![inquiry.senderId, inquiry.recipientId].includes(session.user.id)) {
      return NextResponse.json({ error: "Переписка не найдена." }, { status: 404 });
    }

    const message = await prisma.inquiryMessage.create({
      data: {
        inquiryId: id,
        authorId: session.user.id,
        content,
      },
      select: {
        id: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        id: message.id,
        authorId: message.authorId,
        authorName: message.author.name || "Читатель",
        content: message.content,
        createdAt: message.createdAt,
        isMine: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to send contact inquiry message:", error);
    return NextResponse.json(
      { error: "Не удалось отправить сообщение. Попробуйте снова." },
      { status: 503 },
    );
  }
}
