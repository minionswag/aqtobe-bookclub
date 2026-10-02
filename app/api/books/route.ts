import { DealType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requiredFields = [
  "title",
  "author",
  "description",
  "category",
  "condition",
  "dealType",
  "district",
  "contactInfo",
] as const;

const fieldMaxLengths = {
  title: 160,
  author: 120,
  description: 1200,
  category: 80,
  condition: 80,
  dealType: 10,
  district: 100,
  contactInfo: 160,
} satisfies Record<(typeof requiredFields)[number], number>;

type BookInput = {
  title: string;
  author: string;
  description: string;
  category: string;
  condition: string;
  dealType: DealType;
  district: string;
  contactInfo: string;
  price: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDealType(value: unknown): value is DealType {
  return typeof value === "string" && Object.values(DealType).some((dealType) => dealType === value);
}

function validateBookInput(value: unknown): {
  data?: BookInput;
  errors?: Record<string, string>;
} {
  if (!isRecord(value)) {
    return { errors: { form: "Проверьте данные объявления." } };
  }

  const errors: Record<string, string> = {};
  const fields: Record<(typeof requiredFields)[number], string> = {
    title: "Название книги",
    author: "Автор",
    description: "Описание",
    category: "Категория",
    condition: "Состояние книги",
    dealType: "Тип предложения",
    district: "Район",
    contactInfo: "Контакт для связи",
  };

  for (const field of requiredFields) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      errors[field] = `Заполните поле «${fields[field]}».`;
    } else if (value[field].length > fieldMaxLengths[field]) {
      errors[field] = `Сократите поле «${fields[field]}» до ${fieldMaxLengths[field]} символов.`;
    }
  }

  if (typeof value.dealType === "string" && !isDealType(value.dealType)) {
    errors.dealType = "Выберите обмен, продажу или аренду.";
  }

  const dealType = isDealType(value.dealType) ? value.dealType : null;
  let price: number | null = null;

  if (dealType && dealType !== DealType.EXCHANGE) {
    if (value.price === "" || value.price === null || value.price === undefined) {
      errors.price = "Укажите цену в тенге.";
    } else if (
      (typeof value.price !== "number" && typeof value.price !== "string") ||
      !Number.isFinite(Number(value.price)) ||
      Number(value.price) < 0
    ) {
      errors.price = "Введите корректную цену не меньше нуля.";
    } else {
      price = Number(value.price);
    }
  }

  if (Object.keys(errors).length > 0 || !dealType) {
    return { errors };
  }

  return {
    data: {
      title: (value.title as string).trim(),
      author: (value.author as string).trim(),
      description: (value.description as string).trim(),
      category: (value.category as string).trim(),
      condition: (value.condition as string).trim(),
      dealType,
      district: (value.district as string).trim(),
      contactInfo: (value.contactInfo as string).trim(),
      price,
    },
  };
}

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        condition: true,
        dealType: true,
        price: true,
        district: true,
        contactInfo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Failed to load book listings:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить книги. Попробуйте обновить страницу." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Войдите через Google, чтобы разместить книгу." },
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

  const result = validateBookInput(body);

  if (!result.data) {
    return NextResponse.json(
      { error: "Проверьте обязательные поля формы.", fieldErrors: result.errors },
      { status: 400 },
    );
  }

  try {
    const book = await prisma.book.create({
      data: { ...result.data, userId: session.user.id },
    });
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Failed to create book listing:", error);
    return NextResponse.json(
      { error: "Не удалось сохранить объявление. Проверьте подключение к базе данных." },
      { status: 503 },
    );
  }
}
