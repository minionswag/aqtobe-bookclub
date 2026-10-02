"use client";

import { signIn } from "next-auth/react";

export function GoogleSignInButton({ configured }: { configured: boolean }) {
  return (
    <button
      className="google-sign-in-button"
      type="button"
      disabled={!configured}
      onClick={() => void signIn("google", { callbackUrl: "/account" })}
    >
      <span className="google-mark" aria-hidden="true">G</span>
      Продолжить с Google
    </button>
  );
}
