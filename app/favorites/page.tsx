import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FavoriteRemoveButton } from "@/app/components/favorite-remove-button";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      book: {
        select: {
          id: true,
          title: true,
          author: true,
          category: true,
          district: true,
          imageUrl: true,
          isFound: true,
          dealType: true,
          price: true,
        },
      },
    },
  });

  return (
    <main className="account-page">
      <header className="account-page-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </Link>
        <Link className="account-home-link" href="/account">← В кабинет</Link>
      </header>
      <section className="account-content">
        <p className="eyebrow"><span /> сохранённые книги</p>
        <h1>Моё <em>избранное</em></h1>
        <p className="account-intro">Книги, к которым хочется вернуться.</p>
        {favorites.length ? (
          <div className="favorite-list">
            {favorites.map(({ book }) => (
              <article className="favorite-list-item" key={book.id}>
                <div className="favorite-list-cover" style={book.imageUrl ? { backgroundImage: `url("${book.imageUrl}")` } : undefined}>
                  {!book.imageUrl && <span>{book.title.slice(0, 1).toLocaleUpperCase("ru")}</span>}
                </div>
                <div className="favorite-list-info">
                  <p>{book.category} · {book.district}</p>
                  <h2>{book.title}</h2>
                  <span>{book.author}</span>
                  <strong>
                    {book.dealType === "EXCHANGE" ? "Обмен" : book.price ? `${book.price.toLocaleString("ru-RU")} ₸` : "Уточнить условия"}
                  </strong>
                </div>
                <FavoriteRemoveButton bookId={book.id} />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Избранное пока пусто</h2>
            <p>Нажми на сердечко в каталоге, чтобы сохранить книгу.</p>
            <Link className="account-create-link" href="/#catalog">Открыть каталог <span aria-hidden="true">↗</span></Link>
          </div>
        )}
      </section>
    </main>
  );
}
