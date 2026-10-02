import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeleteListingButton } from "@/app/components/delete-listing-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [books, wishlistRequests] = await Promise.all([
    prisma.book.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, author: true, dealType: true, createdAt: true },
    }),
    prisma.wishlistRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, author: true, createdAt: true },
    }),
  ]);

  return (
    <main className="account-page">
      <header className="account-page-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </Link>
        <Link className="account-home-link" href="/">← На главную</Link>
      </header>
      <section className="account-content">
        <p className="eyebrow"><span /> личный кабинет</p>
        <h1>Привет, <em>{session.user.name || "читатель"}!</em></h1>
        {session.user.email && <p className="account-email">{session.user.email}</p>}
        <p className="account-intro">Здесь собраны твои объявления и заявки сообщества.</p>

        <section className="account-list-section">
          <div className="account-list-heading">
            <h2>Мои книги</h2>
            <span>{books.length}</span>
          </div>
          {books.length ? (
            <div className="account-list">
              {books.map((book) => (
                <article className="account-list-item" key={book.id}>
                  <div>
                    <h3>{book.title}</h3>
                    <p>{book.author} · {book.dealType === "EXCHANGE" ? "Обмен" : book.dealType === "SALE" ? "Продажа" : "Аренда"}</p>
                  </div>
                  <DeleteListingButton id={book.id} kind="book" title={book.title} />
                </article>
              ))}
            </div>
          ) : (
            <p className="account-empty">Пока нет книг, опубликованных из этого аккаунта.</p>
          )}
          <Link className="account-create-link" href="/#catalog">Добавить книгу <span aria-hidden="true">↗</span></Link>
        </section>

        <section className="account-list-section">
          <div className="account-list-heading">
            <h2>Мои заявки</h2>
            <span>{wishlistRequests.length}</span>
          </div>
          {wishlistRequests.length ? (
            <div className="account-list">
              {wishlistRequests.map((request) => (
                <article className="account-list-item" key={request.id}>
                  <div>
                    <h3>{request.title}</h3>
                    <p>{request.author || "Автор не указан"} · Заявка на поиск</p>
                  </div>
                  <DeleteListingButton id={request.id} kind="wishlist" title={request.title} />
                </article>
              ))}
            </div>
          ) : (
            <p className="account-empty">Пока нет опубликованных заявок на поиск.</p>
          )}
          <Link className="account-create-link" href="/#wishlist">Оставить заявку <span aria-hidden="true">↗</span></Link>
        </section>
      </section>
    </main>
  );
}
