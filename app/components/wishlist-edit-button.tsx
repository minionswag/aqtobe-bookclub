"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type EditableWishlistRequest = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
};

const categories = ["Художественная", "Саморазвитие", "Нон-фикшн", "Детская", "Другое"];

export function WishlistEditButton({ request }: { request: EditableWishlistRequest }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/wishlist/${encodeURIComponent(request.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });

      if (!response.ok) {
        const result: unknown = await response.json();
        setError(
          typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Не удалось сохранить заявку.",
        );
        return;
      }

      dialogRef.current?.close();
      window.location.reload();
    } catch {
      setError("Не удалось связаться с сервером. Попробуй ещё раз.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        className="book-status-button"
        type="button"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        aria-haspopup="dialog"
      >
        Изменить
      </button>
      <dialog
        className="listing-dialog"
        ref={dialogRef}
        aria-labelledby={`edit-wishlist-title-${request.id}`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSaving) dialogRef.current?.close();
        }}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Закрыть форму"
          onClick={() => dialogRef.current?.close()}
          disabled={isSaving}
        >
          ×
        </button>
        <p className="eyebrow"><span /> редактирование заявки</p>
        <h2 id={`edit-wishlist-title-${request.id}`}>Изменить <em>заявку</em></h2>
        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Название книги
            <input name="title" required maxLength={160} defaultValue={request.title} />
          </label>
          <div className="form-row">
            <label>
              Автор <span className="optional-label">необязательно</span>
              <input name="author" maxLength={120} defaultValue={request.author ?? ""} />
            </label>
            <label>
              Категория
              <select name="category" defaultValue={request.category ?? ""}>
                <option value="">Любая категория</option>
                {!categories.includes(request.category ?? "") && request.category && (
                  <option>{request.category}</option>
                )}
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <label>
            Пожелания <span className="optional-label">необязательно</span>
            <textarea
              name="description"
              maxLength={800}
              rows={3}
              defaultValue={request.description ?? ""}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" type="submit" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Сохранить изменения"}
          </button>
        </form>
      </dialog>
    </>
  );
}
