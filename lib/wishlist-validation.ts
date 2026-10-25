export type WishlistInput = {
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
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

export function validateWishlistInput(value: unknown): {
  data?: WishlistInput;
  errors?: Record<string, string>;
} {
  if (!isRecord(value)) {
    return { errors: { form: "Проверьте данные заявки." } };
  }

  const errors: Record<string, string> = {};
  const title = typeof value.title === "string" ? value.title.trim() : "";

  if (!title) errors.title = "Напишите название книги, которую ищете.";
  else if (title.length > 160) errors.title = "Сократите название до 160 символов.";

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
    },
  };
}
