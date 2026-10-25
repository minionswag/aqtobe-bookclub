"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";
import type { WishlistListing } from "@/lib/wishlist-types";

function isWishlistListing(value: unknown): value is WishlistListing {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "author" in value &&
    (typeof value.author === "string" || value.author === null) &&
    "category" in value &&
    (typeof value.category === "string" || value.category === null) &&
    "description" in value &&
    (typeof value.description === "string" || value.description === null) &&
    "canReceiveInquiries" in value &&
    typeof value.canReceiveInquiries === "boolean" &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}

export function CreateWishlistButton({
  onCreated,
  googleConfigured,
}: {
  onCreated: (request: WishlistListing) => void;
  googleConfigured: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json();

      if (!response.ok || !isWishlistListing(result)) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Не удалось сохранить заявку. Попробуйте ещё раз.";
        setError(message);
        return;
      }

      onCreated(result);
      dialogRef.current?.close();
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
        className="wishlist-create-button"
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setError("");
          setIsOpen(true);
        }}
      >
        Оставить заявку <span aria-hidden="true">＋</span>
      </button>

      <dialog
        className="listing-dialog"
        ref={dialogRef}
        aria-labelledby="wishlist-dialog-title"
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
        <p className="eyebrow"><span /> подскажи, что ищешь</p>
        <h2 id="wishlist-dialog-title">Ищу <em>книгу</em></h2>
        <p className="dialog-intro">
          Опиши, что ищешь, — возможно, нужная книга уже ждёт на чьей-то полке.
        </p>
        {status === "loading" ? (
          <p className="account-required-message" role="status">Проверяем вход в аккаунт…</p>
        ) : !session?.user ? (
          <div className="account-required-message">
            <p>Войди, чтобы публиковать заявку и управлять ею из личного кабинета.</p>
            <GoogleSignInButton configured={googleConfigured} />
            {!googleConfigured && (
              <a className="auth-back-link" href="/login">Как настроить вход через Google →</a>
            )}
          </div>
        ) : (
        <form className="listing-form" onSubmit={handleSubmit}>
          <label>
            Название книги
            <input
              name="title"
              required
              maxLength={160}
              placeholder="Например, Мастер и Маргарита"
            />
          </label>
          <div className="form-row">
            <label>
              Автор <span className="optional-label">необязательно</span>
              <input name="author" maxLength={120} placeholder="Если знаешь автора" />
            </label>
            <label>
              Категория <span className="optional-label">необязательно</span>
              <select name="category" defaultValue="">
                <option value="">Любая категория</option>
                <option>Художественная</option>
                <option>Саморазвитие</option>
                <option>Нон-фикшн</option>
                <option>Детская</option>
                <option>Другое</option>
              </select>
            </label>
          </div>
          <label>
            Пожелания <span className="optional-label">необязательно</span>
            <textarea
              name="description"
              maxLength={800}
              rows={3}
              placeholder="Например, интересует печатное издание в хорошем состоянии"
            />
          </label>
          <p className="inquiry-privacy-note">
            Контакт не публикуется. Читатели смогут отправить отклик, а ты ответишь им по email в личном кабинете.
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" type="submit" disabled={isSaving}>
            {isSaving ? "Сохраняем…" : "Опубликовать заявку"}
            {!isSaving && <span aria-hidden="true">↗</span>}
          </button>
          <p className="form-note">Заявка появится в открытом списке сайта без личных контактов.</p>
        </form>
        )}
      </dialog>
    </>
  );
}
