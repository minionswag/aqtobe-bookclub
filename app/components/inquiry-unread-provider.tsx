"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type InquiryUnreadContextValue = {
  counts: Record<string, number>;
  error: string;
  refresh: () => void;
};

const InquiryUnreadContext = createContext<InquiryUnreadContextValue>({
  counts: {},
  error: "",
  refresh: () => {},
});

function isUnreadCounts(value: unknown): value is { counts: Record<string, number> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "counts" in value &&
    typeof value.counts === "object" &&
    value.counts !== null &&
    !Array.isArray(value.counts) &&
    Object.values(value.counts).every(
      (count) => typeof count === "number" && Number.isInteger(count) && count >= 0,
    )
  );
}

function getErrorMessage(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return "Не удалось обновить счётчик сообщений. Попробуйте снова.";
}

export function InquiryUnreadProvider({
  inquiryIds,
  children,
}: {
  inquiryIds: string[];
  children: ReactNode;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const idsKey = useMemo(() => JSON.stringify(inquiryIds), [inquiryIds]);
  const refresh = useCallback(() => setRefreshVersion((version) => version + 1), []);

  useEffect(() => {
    if (!inquiryIds.length) {
      return;
    }

    let isCurrent = true;
    let isFetching = false;

    async function loadCounts() {
      if (isFetching) return;
      isFetching = true;

      try {
        const params = new URLSearchParams();
        for (const id of inquiryIds) params.append("id", id);
        const response = await fetch(`/api/contact-inquiries/unread?${params.toString()}`);
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(result));
        if (!isUnreadCounts(result)) {
          throw new Error("Сервер вернул неверный формат счётчика сообщений.");
        }
        if (isCurrent) {
          setCounts(result.counts);
          setError("");
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось обновить счётчик сообщений. Попробуйте снова.",
          );
        }
      } finally {
        isFetching = false;
      }
    }

    void loadCounts();
    const interval = window.setInterval(() => void loadCounts(), 10000);

    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [idsKey, inquiryIds, refreshVersion]);

  return (
    <InquiryUnreadContext.Provider value={{ counts, error, refresh }}>
      {error && (
        <p className="form-error inquiry-unread-error" role="status">
          {error}
        </p>
      )}
      {children}
    </InquiryUnreadContext.Provider>
  );
}

export function useInquiryUnread(inquiryId: string) {
  const { counts, refresh } = useContext(InquiryUnreadContext);
  return { unreadCount: counts[inquiryId] ?? 0, refreshUnreadCounts: refresh };
}
