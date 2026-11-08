"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Notification = { id: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string };

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/notifications").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (Array.isArray(result.notifications)) setNotifications(result.notifications);
    });
  }, []);

  const unread = notifications.filter((notification) => !notification.readAt).length;
  async function markRead() {
    if (!unread) return;
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() })));
  }

  return (
    <div className="notifications-panel">
      <button className="notifications-toggle" type="button" onClick={() => { setOpen((value) => !value); void markRead(); }} aria-expanded={open}>
        Уведомления {unread > 0 && <span>{unread}</span>}
      </button>
      {open && (
        <div className="notifications-popover">
          {notifications.length ? notifications.slice(0, 8).map((notification) => (
            <Link href={notification.href || "/account"} key={notification.id}>
              <strong>{notification.title}</strong><span>{notification.message}</span>
            </Link>
          )) : <p>Пока нет новых уведомлений.</p>}
        </div>
      )}
    </div>
  );
}
