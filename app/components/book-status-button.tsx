"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookStatusButton({
  id,
  title,
  isFound,
}: {
  id: string;
  title: string;
  isFound: boolean;
}) {
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  async function toggleStatus() {
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/books/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFound: !isFound }),
      });

      if (!response.ok) {
        const result: unknown = await response.json();
        setError(
          typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Не удалось изменить статус книги.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте снова.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="book-status-control">
      <button
        className="book-status-button"
        type="button"
        onClick={() => void toggleStatus()}
        disabled={isSaving}
        aria-label={isFound ? `Вернуть «${title}» в каталог` : `Отметить «${title}» как найденную`}
      >
        {isSaving ? "Сохраняем…" : isFound ? "Вернуть в каталог" : "Книгу нашли"}
      </button>
      {error && <span className="delete-listing-error" role="alert">{error}</span>}
    </div>
  );
}
