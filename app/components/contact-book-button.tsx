"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";

export function ContactBookButton({
  targetId,
  targetType,
  targetTitle,
  canReceiveInquiries,
  googleConfigured,
}: {
  targetId: string;
  targetType: "book" | "wishlist";
  targetTitle: string;
  canReceiveInquiries: boolean;
  googleConfigured: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [shareIdentity, setShareIdentity] = useState(false);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/contact-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, targetType, message, shareIdentity }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(
          typeof result === "object" &&
            result !== null &&
            "error" in result &&
            typeof result.error === "string"
            ? result.error
            : "Не удалось отправить отклик. Попробуйте ещё раз.",
        );
        return;
      }

      setSent(true);
      setMessage("");
      setShareIdentity(false);
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {canReceiveInquiries ? (
        <button
          className="details-link inquiry-trigger"
          type="button"
          onClick={() => {
            setError("");
            setSent(false);
            setIsOpen(true);
          }}
        >
          Откликнуться <span aria-hidden="true">↗</span>
        </button>
      ) : (
        <span
          className="details-link"
          title="Автор публикации не связан с аккаунтом, поэтому отклик через сайт недоступен"
        >
          Автор не привязан
        </span>
      )}
      <dialog
        className="listing-dialog inquiry-dialog"
        ref={dialogRef}
        aria-labelledby={`inquiry-title-${targetType}-${targetId}`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isSending) {
            dialogRef.current?.close();
          }
        }}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Закрыть форму"
          onClick={() => dialogRef.current?.close()}
          disabled={isSending}
        >
          ×
        </button>
        <p className="eyebrow"><span /> безопасный отклик</p>
        <h2 id={`inquiry-title-${targetType}-${targetId}`}>
          {targetType === "book" ? "Книга" : "Заявка"} <em>«{targetTitle}»</em>
        </h2>
        {status === "loading" ? (
          <p className="account-required-message" role="status">Проверяем вход в аккаунт…</p>
        ) : !session?.user ? (
          <div className="account-required-message">
            <p>Войди в аккаунт, чтобы отправить сообщение автору. Контакты в каталоге не показываются.</p>
            <GoogleSignInButton configured={googleConfigured} />
            {!googleConfigured && (
              <Link className="auth-back-link" href="/login">О настройке входа через Google →</Link>
            )}
          </div>
        ) : sent ? (
          <div className="inquiry-success" role="status">
            <p>Отклик отправлен. Автор публикации сможет ответить на него в личном кабинете.</p>
            <button className="form-submit" type="button" onClick={() => dialogRef.current?.close()}>
              Готово
            </button>
          </div>
        ) : (
          <form className="listing-form" onSubmit={handleSubmit}>
            <p className="inquiry-privacy-note">
              Только автор публикации увидит твоё имя и email аккаунта, чтобы ответить. Они не публикуются.
            </p>
            <label>
              Сообщение
              <textarea
                required
                maxLength={1000}
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Напиши автору публикации"
              />
            </label>
            <label className="contact-consent">
              <input
                type="checkbox"
                checked={shareIdentity}
                onChange={(event) => setShareIdentity(event.target.checked)}
                required
              />
              <span>Разрешаю передать автору моё имя и email аккаунта для ответа.</span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="form-submit" type="submit" disabled={isSending || !shareIdentity}>
              {isSending ? "Отправляем…" : "Отправить отклик"}
              {!isSending && <span aria-hidden="true">↗</span>}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
