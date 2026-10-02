import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type WishlistInput = {
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
  contactInfo: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalText(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
  errors: Record<string, string>,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    errors[field] = `Проверьте поле «${label}».`;
    return null;
  }

  const text = value.trim();
  if (text.length > maxLength) {
    errors[field] = `Сократите поле «${label}» до ${maxLength} символов.`;
    return null;
  }

  return text || null;
}

function validateWishlistInput(value: unknown): {
  data?: WishlistInput;
  errors?: Record<string, string>;
} {
  if (!isRecord(value)) {
    return { errors: { form: "Проверьте данные заявки." } };
  }

  const errors: Record<string, string> = {};
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const contactInfo = typeof value.contactInfo === "string" ? value.contactInfo.trim() : "";

  if (!title) errors.title = "Напишите название книги, которую ищете.";
  else if (title.length > 160) errors.title = "Сократите название до 160 символов.";

  if (!contactInfo) errors.contactInfo = "Укажите контакт для связи.";
  else if (contactInfo.length > 160) errors.contactInfo = "Сократите контакт до 160 символов.";

  if (value.contactIsPublic !== true) {
    errors.contactIsPublic = "Подтвердите, что контакт будет опубликован в заявке.";
  }

  const author = getOptionalText(value.author, "author", "Автора", 120, errors);
  const category = getOptionalText(value.category, "category", "Категорию", 80, errors);
  const description = getOptionalText(value.description, "description", "Описание", 800, errors);

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      title,
      author,
      category,
      description,
      contactInfo,
    },
  };
}

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
        contactInfo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(requests);
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
      data: { ...result.data, userId: session.user.id },
    });
    return NextResponse.json(wishlistRequest, { status: 201 });
  } catch (error) {
    console.error("Failed to create wishlist request:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить заявку. Проверьте подключение к базе данных." },
      { status: 503 },
    );
  }
}
