"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AccountButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="account-button-placeholder" aria-hidden="true" />;
  }

  if (session?.user) {
    return (
      <div className="account-actions">
        <Link className="account-link" href="/account">
          <span className="account-avatar">{session.user.name?.charAt(0).toLocaleUpperCase() || "Я"}</span>
          <span>Мой кабинет</span>
        </Link>
        <button className="account-signout" type="button" onClick={() => void signOut({ callbackUrl: "/" })}>
          Выйти
        </button>
      </div>
    );
  }

  return <Link className="login-link" href="/login">Войти</Link>;
}
