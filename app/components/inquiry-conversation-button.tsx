"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useInquiryUnread } from "@/app/components/inquiry-unread-provider";

type ConversationMessage = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isMine: boolean;
};

function isConversationMessage(value: unknown): value is ConversationMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "authorId" in value &&
    typeof value.authorId === "string" &&
    "authorName" in value &&
    typeof value.authorName === "string" &&
    "content" in value &&
    typeof value.content === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "isMine" in value &&
    typeof value.isMine === "boolean"
  );
}

function isConversationMessages(value: unknown): value is { messages: ConversationMessage[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.every(isConversationMessage)
  );
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return fallback;
}

export function InquiryConversationButton({
  inquiryId,
  listingTitle,
  participantName,
}: {
  inquiryId: string;
  listingTitle: string;
  participantName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { unreadCount, refreshUnreadCounts } = useInquiryUnread(inquiryId);

  function closeConversation() {
    setIsOpen(false);
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    let isCurrent = true;

    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/contact-inquiries/${encodeURIComponent(inquiryId)}/messages`,
          { signal: controller.signal },
        );
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(result, "Не удалось загрузить переписку."));
        if (!isConversationMessages(result)) throw new Error("Сервер вернул неверный формат переписки.");
        if (isCurrent) {
          setMessages((current) => {
            const merged = new Map(current.map((message) => [message.id, message]));
            for (const message of result.messages) merged.set(message.id, message);
            const updated = [...merged.values()].sort(
              (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
            );
            return updated.length === current.length &&
              updated.every((message, index) => message.id === current[index]?.id)
              ? current
              : updated;
          });
          setError("");
          refreshUnreadCounts();
        }
      } catch (loadError) {
        if (!isCurrent || (loadError instanceof Error && loadError.name === "AbortError")) return;
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить переписку.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadMessages();
    const interval = window.setInterval(() => void loadMessages(), 5000);

    return () => {
      isCurrent = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [inquiryId, isOpen, refreshUnreadCounts]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    setError("");
    setIsSending(true);

    try {
      const response = await fetch(
        `/api/contact-inquiries/${encodeURIComponent(inquiryId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      const result: unknown = await response.json();

      if (!response.ok) {
        setError(getErrorMessage(result, "Не удалось отправить сообщение."));
        return;
      }

      if (!isConversationMessage(result)) {
        throw new Error("Сервер вернул неверный формат сообщения.");
      }

      setMessages((current) =>
        current.some((message) => message.id === result.id)
          ? current
          : [...current, result].sort(
              (first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt),
            ),
      );
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Не удалось отправить сообщение.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="account-chat-action">
        <button
          className="book-status-button"
          type="button"
          onClick={() => {
            setError("");
            setIsLoading(true);
            setIsOpen(true);
          }}
          aria-haspopup="dialog"
        >
          Открыть чат
        </button>
        {unreadCount > 0 && (
          <span className="inquiry-unread-badge" aria-label={`${unreadCount} непрочитанных сообщений`}>
            {unreadCount}
          </span>
        )}
      </div>
      <dialog
        className="listing-dialog conversation-dialog"
        ref={dialogRef}
        aria-labelledby={`conversation-title-${inquiryId}`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeConversation();
        }}
      >
        <button
          className="dialog-close"
          type="button"
          aria-label="Закрыть чат"
          onClick={closeConversation}
        >
          ×
        </button>
        <p className="eyebrow"><span /> переписка по книге</p>
        <h2 id={`conversation-title-${inquiryId}`}>
          <em>{listingTitle}</em>
        </h2>
        <p className="conversation-participant">Собеседник: {participantName}</p>
        <div className="conversation-messages" aria-live="polite" aria-busy={isLoading}>
          {isLoading && messages.length === 0 ? (
            <p className="conversation-state">Загружаем сообщения…</p>
          ) : messages.length === 0 ? (
            <p className="conversation-state">Сообщений пока нет.</p>
          ) : (
            messages.map((message) => (
              <article
                className={`conversation-message${message.isMine ? " conversation-message-mine" : ""}`}
                key={message.id}
              >
                <div className="conversation-message-heading">
                  <strong>{message.isMine ? "Ты" : message.authorName}</strong>
                  <time dateTime={message.createdAt}>
                    {new Intl.DateTimeFormat("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(message.createdAt))}
                  </time>
                </div>
                <p>{message.content}</p>
              </article>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="conversation-compose" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor={`conversation-draft-${inquiryId}`}>
            Новое сообщение
          </label>
          <textarea
            id={`conversation-draft-${inquiryId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Напиши сообщение…"
            required
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" type="submit" disabled={isSending || !draft.trim()}>
            {isSending ? "Отправляем…" : "Отправить"}
            {!isSending && <span aria-hidden="true">↗</span>}
          </button>
          <p className="conversation-refresh-note">Новые сообщения обновляются автоматически.</p>
        </form>
      </dialog>
    </>
  );
}
