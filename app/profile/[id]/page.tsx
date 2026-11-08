import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type ProfilePageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await prisma.user.findUnique({
    where: { id },
    select: {
      name: true,
      image: true,
      bio: true,
      city: true,
      createdAt: true,
      books: {
        where: { isFound: false },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, author: true, category: true, district: true, imageUrl: true },
      },
    },
  });

  if (!profile) notFound();

  const displayName = profile.name || "Читатель";
  return (
    <main className="account-page">
      <header className="account-page-header">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </Link>
        <Link className="account-home-link" href="/">← На главную</Link>
      </header>
      <section className="account-content public-profile">
        <div className="public-profile-header">
          <div
            className="public-profile-avatar"
            style={profile.image ? { backgroundImage: `url("${profile.image}")` } : undefined}
            aria-hidden="true"
          >
            {!profile.image && displayName.slice(0, 1).toLocaleUpperCase("ru")}
          </div>
          <div>
            <p className="eyebrow"><span /> участник сообщества</p>
            <h1>{displayName}</h1>
            {profile.city && <p className="account-email">{profile.city}</p>}
            <p className="public-profile-date">
              В клубе с {new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(profile.createdAt)}
            </p>
          </div>
        </div>
        {profile.bio && <p className="public-profile-bio">{profile.bio}</p>}
        <section className="account-list-section">
          <div className="account-list-heading">
            <h2>Публикации участника</h2>
            <span>{profile.books.length}</span>
          </div>
          {profile.books.length ? (
            <div className="public-profile-books">
              {profile.books.map((book) => (
                <Link className="public-profile-book" href={`/#catalog`} key={book.id}>
                  <div
                    className="public-profile-book-cover"
                    style={book.imageUrl ? { backgroundImage: `url("${book.imageUrl}")` } : undefined}
                    aria-hidden="true"
                  >
                    {!book.imageUrl && book.title.slice(0, 1).toLocaleUpperCase("ru")}
                  </div>
                  <div>
                    <p>{book.category} · {book.district}</p>
                    <h3>{book.title}</h3>
                    <span>{book.author}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="account-empty">Участник пока не разместил доступных книг.</p>
          )}
        </section>
      </section>
    </main>
  );
}
