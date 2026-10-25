"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";
import type { BookListing, DealType } from "@/lib/book-types";

const dealOptions: { value: DealType; label: string }[] = [
  { value: "EXCHANGE", label: "Обмен" },
  { value: "SALE", label: "Продажа" },
  { value: "RENT", label: "Аренда" },
];

function isBookListing(value: unknown): value is BookListing {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "author" in value &&
    typeof value.author === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "condition" in value &&
    typeof value.condition === "string" &&
    "district" in value &&
    typeof value.district === "string" &&
    "dealType" in value &&
    (value.dealType === "EXCHANGE" || value.dealType === "SALE" || value.dealType === "RENT") &&
    "price" in value &&
    (typeof value.price === "number" || value.price === null) &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "isFound" in value &&
    typeof value.isFound === "boolean" &&
    "canReceiveInquiries" in value &&
    typeof value.canReceiveInquiries === "boolean"
  );
}

export function CreateBookButton({
  onCreated,
  googleConfigured,
}: {
  onCreated: (book: BookListing) => void;
  googleConfigured: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dealType, setDealType] = useState<DealType>("EXCHANGE");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    };
  }, []);

  function updateImagePreview(file: File | null) {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current);
    imagePreviewUrlRef.current = file ? URL.createObjectURL(file) : null;
    setImagePreviewUrl(imagePreviewUrlRef.current ?? "");
    setSelectedImage(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("dealType", dealType);

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();

      if (!response.ok || !isBookListing(result)) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Не удалось сохранить объявление. Попробуйте ещё раз.";
        setError(message);
        return;
      }

      onCreated(result);
      dialogRef.current?.close();
      setDealType("EXCHANGE");
      updateImagePreview(null);
      formElement.reset();
    } catch {
      setError("Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        className="header-cta create-listing-trigger"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
        type="button"
        aria-haspopup="dialog"
      >
        Разместить книгу <span aria-hidden="true">＋</span>
      </button>

      <dialog
        className="listing-dialog"
        ref={dialogRef}
        aria-labelledby="listing-dialog-title"
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSaving) {
            dialogRef.current?.close();
          }
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
            <p className="eyebrow"><span /> поделись хорошей историей</p>
            <h2 id="listing-dialog-title">Добавить <em>книгу</em></h2>
            <p className="dialog-intro">
              Заполни объявление — и книга найдёт нового читателя в Актобе.
            </p>
            {status === "loading" ? (
              <p className="account-required-message" role="status">Проверяем вход в аккаунт…</p>
            ) : !session?.user ? (
              <div className="account-required-message">
                <p>Чтобы опубликовать книгу и управлять объявлением, сначала войди в аккаунт клуба.</p>
                <GoogleSignInButton configured={googleConfigured} />
                {!googleConfigured && (
                  <a className="auth-back-link" href="/login">Как настроить вход через Google →</a>
                )}
              </div>
            ) : (
            <form className="listing-form" onSubmit={handleSubmit}>
              <label>
                Название книги
                <input name="title" required maxLength={160} placeholder="Например, Маленький принц" />
              </label>
              <div className="form-row">
                <label>
                  Автор
                  <input name="author" required maxLength={120} placeholder="Имя автора" />
                </label>
                <label>
                  Категория
                  <select name="category" required defaultValue="">
                    <option value="" disabled>Выбери категорию</option>
                    <option>Художественная</option>
                    <option>Саморазвитие</option>
                    <option>Нон-фикшн</option>
                    <option>Детская</option>
                    <option>Другое</option>
                  </select>
                </label>
              </div>
              <label>
                Описание
                <textarea
                  name="description"
                  required
                  maxLength={1200}
                  rows={3}
                  placeholder="Расскажи о книге и её состоянии"
                />
              </label>
              <div className="form-row">
                <label>
                  Состояние
                  <select name="condition" required defaultValue="">
                    <option value="" disabled>Выбери состояние</option>
                    <option>Как новая</option>
                    <option>Отличное</option>
                    <option>Хорошее</option>
                    <option>Есть заметные следы чтения</option>
                  </select>
                </label>
                <label>
                  Район Актобе
                  <input name="district" required maxLength={100} placeholder="Например, Центр" />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Тип предложения
                  <select
                    name="dealType"
                    value={dealType}
                    onChange={(event) => setDealType(event.target.value as DealType)}
                  >
                    {dealOptions.map((option) => (
                      <option value={option.value} key={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {dealType === "EXCHANGE" ? (
                  <label>
                    Цена
                    <input key="exchange" type="text" defaultValue="Обмен" disabled readOnly />
                  </label>
                ) : (
                  <label>
                    Цена, ₸
                    <input
                      key={dealType}
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="Например, 3000"
                    />
                  </label>
                )}
              </div>
              <label>
                <span>Фотография книги <span className="optional-field">(необязательно)</span></span>
                <input
                  className="book-image-input"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      updateImagePreview(null);
                      setError("Размер изображения не должен превышать 5 МБ.");
                      event.target.value = "";
                      return;
                    }
                    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      updateImagePreview(null);
                      setError("Выберите изображение JPG, PNG или WebP.");
                      event.target.value = "";
                      return;
                    }
                    setError("");
                    updateImagePreview(file);
                  }}
                />
              </label>
              {imagePreviewUrl && (
                <div className="book-image-preview">
                  <Image
                    src={imagePreviewUrl}
                    alt="Предпросмотр фотографии книги"
                    width={160}
                    height={120}
                    unoptimized
                  />
                  <span>{selectedImage?.name}</span>
                </div>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="form-submit" type="submit" disabled={isSaving}>
                {isSaving ? "Сохраняем…" : "Опубликовать книгу"}
                {!isSaving && <span aria-hidden="true">↗</span>}
              </button>
              <p className="form-note">Контакты не публикуются. Читатели смогут отправить отклик через сайт.</p>
            </form>
            )}
      </dialog>
    </>
  );
}
