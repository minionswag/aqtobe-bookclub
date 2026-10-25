import { DealType } from "@prisma/client";

const requiredFields = [
  "title",
  "author",
  "description",
  "category",
  "condition",
  "dealType",
  "district",
] as const;

const fieldMaxLengths = {
  title: 160,
  author: 120,
  description: 1200,
  category: 80,
  condition: 80,
  dealType: 10,
  district: 100,
} satisfies Record<(typeof requiredFields)[number], number>;

export type BookInput = {
  title: string;
  author: string;
  description: string;
  category: string;
  condition: string;
  dealType: DealType;
  district: string;
  price: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDealType(value: unknown): value is DealType {
  return typeof value === "string" && Object.values(DealType).some((dealType) => dealType === value);
}

export function validateBookInput(value: unknown): {
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
      price,
    },
  };
}
