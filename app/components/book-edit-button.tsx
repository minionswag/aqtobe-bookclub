"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";

type EditableBook = {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  condition: string;
  dealType: "EXCHANGE" | "SALE" | "RENT";
  price: number | null;
  district: string;
  imageUrl: string | null;
};

const categories = ["Художественная", "Саморазвитие", "Нон-фикшн", "Детская", "Другое"];
const conditions = ["Как новая", "Отличное", "Хорошее", "Есть заметные следы чтения"];

export function BookEditButton({ book }: { book: EditableBook }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dealType, setDealType] = useState(book.dealType);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
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
      formData.set("dealType", dealType);
      formData.set("removeImage", String(removeImage));
      const response = await fetch(`/api/books/${encodeURIComponent(book.id)}`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const result: unknown = await response.json();
        setError(
          typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Не удалось сохранить книгу.",
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
          setRemoveImage(false);
          setDealType(book.dealType);
          setIsOpen(true);
        }}
        aria-haspopup="dialog"
      >
        Изменить
      </button>
      <dialog
        className="listing-dialog"
        ref={dialogRef}
        aria-labelledby={`edit-book-title-${book.id}`}
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
        <p className="eyebrow"><span /> редактирование объявления</p>
        <h2 id={`edit-book-title-${book.id}`}>Изменить <em>книгу</em></h2>
        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Название книги
            <input name="title" required maxLength={160} defaultValue={book.title} />
          </label>
          <div className="form-row">
            <label>
              Автор
              <input name="author" required maxLength={120} defaultValue={book.author} />
            </label>
            <label>
              Категория
              <select name="category" required defaultValue={book.category}>
                {!categories.includes(book.category) && <option>{book.category}</option>}
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <label>
            Описание
            <textarea name="description" required maxLength={1200} rows={3} defaultValue={book.description} />
          </label>
          <div className="form-row">
            <label>
              Состояние
              <select name="condition" required defaultValue={book.condition}>
                {!conditions.includes(book.condition) && <option>{book.condition}</option>}
                {conditions.map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
            <label>
              Район Актобе
              <input name="district" required maxLength={100} defaultValue={book.district} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Тип предложения
              <select
                name="dealType"
                value={dealType}
                onChange={(event) => setDealType(event.target.value as EditableBook["dealType"])}
              >
                <option value="EXCHANGE">Обмен</option>
                <option value="SALE">Продажа</option>
                <option value="RENT">Аренда</option>
              </select>
            </label>
            {dealType === "EXCHANGE" ? (
              <label>
                Цена
                <input type="text" value="Обмен" disabled readOnly />
              </label>
            ) : (
              <label>
                Цена, ₸
                <input
                  name="price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  defaultValue={book.price ?? ""}
                />
              </label>
            )}
          </div>
          {book.imageUrl && !removeImage && (
            <div className="book-image-preview">
              <Image
                src={book.imageUrl}
                alt={`Текущее фото книги «${book.title}»`}
                width={160}
                height={120}
                unoptimized={book.imageUrl.startsWith("https://")}
              />
              <button className="text-button" type="button" onClick={() => setRemoveImage(true)}>
                Удалить фото
              </button>
            </div>
          )}
          {removeImage && (
            <p className="inquiry-privacy-note">
              Текущее фото будет удалено. Можно выбрать новое ниже.
              <button className="text-button" type="button" onClick={() => setRemoveImage(false)}>
                Отменить
              </button>
            </p>
          )}
          <label>
            Новая фотография <span className="optional-label">необязательно</span>
            <input
              className="book-image-input"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
