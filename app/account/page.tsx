import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DeleteListingButton } from "@/app/components/delete-listing-button";
import { BookStatusButton } from "@/app/components/book-status-button";
import { BookEditButton } from "@/app/components/book-edit-button";
import { WishlistEditButton } from "@/app/components/wishlist-edit-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [books, wishlistRequests, receivedInquiries] = await Promise.all([
    prisma.book.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        category: true,
        condition: true,
        dealType: true,
        price: true,
        district: true,
        imageUrl: true,
        isFound: true,
        createdAt: true,
      },
    }),
    prisma.wishlistRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        category: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.contactInquiry.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        message: true,
        createdAt: true,
        book: { select: { title: true } },
        wishlistRequest: { select: { title: true } },
        sender: { select: { name: true, email: true } },
      },
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
            <h2>Входящие отклики</h2>
            <span>{receivedInquiries.length}</span>
          </div>
          {receivedInquiries.length ? (
            <div className="account-inquiry-list">
              {receivedInquiries.map((inquiry) => {
                const listingTitle =
                  inquiry.book?.title ?? inquiry.wishlistRequest?.title ?? "удалённая публикация";
                const listingType = inquiry.book ? "Книга" : "Заявка";

                return (
                  <article className="account-inquiry" key={inquiry.id}>
                    <div className="account-inquiry-heading">
                      <h3>{listingType}: {listingTitle}</h3>
                      <time dateTime={inquiry.createdAt.toISOString()}>
                        {new Intl.DateTimeFormat("ru-RU", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(inquiry.createdAt)}
                      </time>
                    </div>
                    <p className="account-inquiry-message">{inquiry.message}</p>
                    <p className="account-inquiry-sender">
                      {inquiry.sender.name || "Читатель"}
                      {inquiry.sender.email ? (
                        <> · <a href={`mailto:${inquiry.sender.email}`}>{inquiry.sender.email}</a></>
                      ) : null}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="account-empty">Когда читатели откликнутся на твои публикации, сообщения появятся здесь.</p>
          )}
        </section>

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
                    <p>
                      {book.author} · {book.dealType === "EXCHANGE" ? "Обмен" : book.dealType === "SALE" ? "Продажа" : "Аренда"}
                      {book.isFound ? " · Книгу нашли" : ""}
                    </p>
                  </div>
                  <div className="account-list-actions">
                    <BookEditButton book={book} />
                    <BookStatusButton id={book.id} title={book.title} isFound={book.isFound} />
                    <DeleteListingButton id={book.id} kind="book" title={book.title} />
                  </div>
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
                  <div className="account-list-actions">
                    <WishlistEditButton request={request} />
                    <DeleteListingButton id={request.id} kind="wishlist" title={request.title} />
                  </div>
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
