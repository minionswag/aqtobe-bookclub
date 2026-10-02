import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, googleSignInConfigured } from "@/auth";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </Link>
        <p className="eyebrow"><span /> книжное сообщество Актобе</p>
        <h1>Твоя книжная <em>полка</em></h1>
        <p className="auth-description">
          Войди, чтобы публиковать объявления, оставлять заявки и управлять своими публикациями.
        </p>
        {googleSignInConfigured ? (
          <GoogleSignInButton configured />
        ) : (
          <div className="auth-setup-notice">
            <strong>Вход через Google ещё не настроен</strong>
            <p>Добавь OAuth Client ID и Client Secret в локальный файл `.env`, затем перезапусти сайт.</p>
            <p>Обратный адрес для Google: <code>http://localhost:3000/api/auth/callback/google</code></p>
            <p>Секрет OAuth не отправляй в чат и не публикуй в проекте.</p>
          </div>
        )}
        <Link className="auth-back-link" href="/">← Вернуться на главную</Link>
      </section>
    </main>
  );
}
