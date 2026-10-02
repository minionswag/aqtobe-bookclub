"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteListingButton({
  id,
  kind,
  title,
}: {
  id: string;
  kind: "book" | "wishlist";
  title: string;
}) {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm(`Удалить «${title}»? Это действие нельзя отменить.`)) return;
    setError("");
    setIsDeleting(true);

    try {
      const endpoint = kind === "book" ? `/api/books/${encodeURIComponent(id)}` : `/api/wishlist/${encodeURIComponent(id)}`;
      const response = await fetch(endpoint, { method: "DELETE" });

      if (!response.ok) {
        const result: unknown = await response.json();
        setError(
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Не удалось удалить публикацию.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте снова.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="delete-listing-control">
      <button className="delete-listing-button" type="button" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? "Удаляем…" : "Удалить"}
      </button>
      {error && <span className="delete-listing-error" role="alert">{error}</span>}
    </div>
  );
}
