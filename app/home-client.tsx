"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AccountButton } from "@/app/components/account-button";
import { CreateBookButton } from "@/app/components/create-book-button";
import { CreateWishlistButton } from "@/app/components/create-wishlist-button";
import type { BookListing, DealType as ListingDealType } from "@/lib/book-types";
import type { WishlistListing } from "@/lib/wishlist-types";

type DealType = "Обмен" | "Продажа" | "Аренда";

type Book = Omit<BookListing, "dealType"> & {
  dealType: DealType;
  initials: string;
  cover: string;
  coverAccent: string;
  label: string;
};

const categories = ["Все книги", "Художественная", "Саморазвитие", "Нон-фикшн"];
const dealFilters = ["Все предложения", "Обмен", "Продажа", "Аренда"] as const;
const coverPalette = [
  ["#d9a361", "#793d2c"],
  ["#d8e6ce", "#40563d"],
  ["#da7563", "#71332d"],
  ["#e5c75e", "#4f5134"],
  ["#aacbd1", "#315b61"],
  ["#b9a8c9", "#4b3c5e"],
];

const dealLabels: Record<ListingDealType, DealType> = {
  EXCHANGE: "Обмен",
  SALE: "Продажа",
  RENT: "Аренда",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBookListing(value: unknown): value is BookListing {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.author === "string" &&
    typeof value.description === "string" &&
    typeof value.category === "string" &&
    typeof value.condition === "string" &&
    typeof value.district === "string" &&
    typeof value.contactInfo === "string" &&
    (value.dealType === "EXCHANGE" || value.dealType === "SALE" || value.dealType === "RENT") &&
    (typeof value.price === "number" || value.price === null)
  );
}

function isWishlistListing(value: unknown): value is WishlistListing {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (typeof value.author === "string" || value.author === null) &&
    (typeof value.category === "string" || value.category === null) &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.contactInfo === "string" &&
    typeof value.createdAt === "string"
  );
}

function getContactHref(contactInfo: string): string | null {
  const contact = contactInfo.trim();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    return `mailto:${contact}`;
  }

  if (/^\+?[\d\s()-]{7,}$/.test(contact)) {
    return `tel:${contact.replace(/[^\d+]/g, "")}`;
  }

  try {
    const url = new URL(contact);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatRequestDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

function decorateBook(book: BookListing, index: number): Book {
  const [cover, coverAccent] = coverPalette[index % coverPalette.length];
  const titleInitials = book.title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toLocaleUpperCase("ru");

  return {
    ...book,
    dealType: dealLabels[book.dealType],
    initials: titleInitials,
    cover,
    coverAccent,
    label: book.category.toLocaleLowerCase("ru"),
  };
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "is-filled" : ""}>
      <path d="M20.8 8.8c0 4.4-8.8 10-8.8 10s-8.8-5.6-8.8-10a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z" />
    </svg>
  );
}

function BookCard({
  book,
  isFavorite,
  onToggleFavorite,
}: {
  book: Book;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const contactHref = getContactHref(book.contactInfo);

  return (
    <article className="book-card">
      <div
        className="book-cover"
        style={
          {
            "--cover": book.cover,
            "--cover-accent": book.coverAccent,
          } as CSSProperties
        }
      >
        <span className="cover-label">{book.label}</span>
        <span className="cover-title">{book.initials}</span>
        <span className="cover-author">{book.author}</span>
        <button
          className={`favorite-button${isFavorite ? " favorite-active" : ""}`}
          type="button"
          aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(book.id)}
        >
          <HeartIcon filled={isFavorite} />
        </button>
        <span className={`deal-tag deal-${book.dealType === "Обмен" ? "exchange" : book.dealType === "Продажа" ? "sale" : "rent"}`}>
          {book.dealType}
        </span>
      </div>
      <div className="book-info">
        <p className="book-category">{book.category}</p>
        <h3>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="book-meta">
          <span>{book.condition}</span>
          <span className="meta-dot" />
          <span>{book.district}</span>
        </div>
        <div className="book-card-bottom">
          <span className="book-price">
            {book.dealType === "Обмен"
              ? "Обмен на книгу"
              : `${book.price?.toLocaleString("ru-RU")} ₸`}
          </span>
          {contactHref ? (
            <a
              className="details-link"
              href={contactHref}
              aria-label={`Связаться с владельцем книги «${book.title}»`}
            >
              Связаться <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <span className="details-link" title={book.contactInfo}>
              Контакт в объявлении
            </span>
          )}
        </div>
        <p className="book-contact"><span>Связаться:</span> {book.contactInfo}</p>
      </div>
    </article>
  );
}

function formatBookCount(count: number): string {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "книг";
  if (lastDigit === 1) return "книга";
  if (lastDigit >= 2 && lastDigit <= 4) return "книги";
  return "книг";
}

export default function Home({ googleConfigured }: { googleConfigured: boolean }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [wishlistRequests, setWishlistRequests] = useState<WishlistListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все книги");
  const [activeDeal, setActiveDeal] = useState<(typeof dealFilters)[number]>("Все предложения");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let isCurrent = true;

    async function loadBooks() {
      try {
        const response = await fetch("/api/books");
        const result: unknown = await response.json();

        if (!response.ok || !Array.isArray(result) || !result.every(isBookListing)) {
          throw new Error(
            isRecord(result) && typeof result.error === "string"
              ? result.error
              : "Не удалось загрузить каталог книг.",
          );
        }

        if (isCurrent) {
          setBooks(result.map((book, index) => decorateBook(book, index)));
          setLoadError("");
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить каталог книг.",
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadBooks();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadWishlistRequests() {
      try {
        const response = await fetch("/api/wishlist");
        const result: unknown = await response.json();

        if (!response.ok || !Array.isArray(result) || !result.every(isWishlistListing)) {
          throw new Error(
            isRecord(result) && typeof result.error === "string"
              ? result.error
              : "Не удалось загрузить заявки.",
          );
        }

        if (isCurrent) {
          setWishlistRequests(result);
          setWishlistError("");
        }
      } catch (error) {
        if (isCurrent) {
          setWishlistError(
            error instanceof Error ? error.message : "Не удалось загрузить заявки.",
          );
        }
      } finally {
        if (isCurrent) setIsWishlistLoading(false);
      }
    }

    void loadWishlistRequests();
    return () => {
      isCurrent = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");

    return books.filter((book) => {
      const matchesSearch =
        !query ||
        `${book.title} ${book.author} ${book.category} ${book.district}`
          .toLocaleLowerCase("ru")
          .includes(query);
      const matchesCategory =
        activeCategory === "Все книги" || book.category === activeCategory;
      const matchesDeal = activeDeal === "Все предложения" || book.dealType === activeDeal;

      return matchesSearch && matchesCategory && matchesDeal;
    });
  }, [activeCategory, activeDeal, books, search]);

  function toggleFavorite(bookId: string) {
    setFavorites((current) =>
      current.includes(bookId)
        ? current.filter((favoriteId) => favoriteId !== bookId)
        : [...current, bookId],
    );
  }

  return (
    <main className="site-shell">
      <div className="announcement">
        <span className="announcement-sparkle" aria-hidden="true">✳</span>
        Книги находят новых читателей, а люди — друг друга
        <span className="announcement-city">АКТОБЕ · KZ</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#" aria-label="Aqtobe BookClub — на главную">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#wishlist">Заявки</a>
          <a href="#how-it-works">Как это работает</a>
          <a href="#community">О сообществе</a>
        </nav>
        <a className="header-cta find-books-link" href="#catalog">
          Найти книгу <span aria-hidden="true">↗</span>
        </a>
        <AccountButton />
        <CreateBookButton
          googleConfigured={googleConfigured}
          onCreated={(listing) => {
            const newBook = decorateBook(listing, books.length);
            setBooks((current) => [newBook, ...current]);
            setSearch("");
            setActiveCategory("Все книги");
            setActiveDeal("Все предложения");
          }}
        />
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span /> книжное сообщество Актобе</div>
          <h1>
            Хорошие книги
            <br />
            <em>должны читаться.</em>
          </h1>
          <p className="hero-description">
            Меняйся, делись, находи свою следующую любимую историю.
            Книги рядом — люди тоже.
          </p>
          <form
            className="search-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <SearchIcon />
            <input
              aria-label="Поиск по книгам и авторам"
              placeholder="Название книги или автор"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit">Найти книгу</button>
          </form>
          <a className="hero-wishlist-link" href="#wishlist">
            Ищешь книгу? <span>Оставь заявку</span> <span aria-hidden="true">→</span>
          </a>
          <div className="hero-note">
            <span className="avatar-stack" aria-hidden="true">
              <span>А</span><span>М</span><span>Д</span>
            </span>
            <span><strong>Уже читают вместе</strong> — присоединяйся к своим</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="art-note note-top">читай · делись · повторяй</div>
          <div className="hero-book hero-book-back">
            <span>истории,<br />которые<br />остаются</span>
          </div>
          <div className="hero-book hero-book-front">
            <span className="hero-book-kicker">КЛУБ КНИЖНЫХ ЛЮДЕЙ</span>
            <span className="hero-book-title">от книги<br />к человеку</span>
            <span className="hero-book-symbol">✳</span>
          </div>
          <div className="art-note note-bottom">АКТОБЕ • 2026</div>
          <div className="art-sticker">прочитал?<br /><strong>передай</strong> дальше</div>
        </div>
        <a className="scroll-hint" href="#catalog"><span /> листай к книгам</a>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span /> полка сообщества</div>
            <h2>Книги ищут <em>читателей</em></h2>
          </div>
          <p>Каждая книга здесь уже прочитана кем-то<br className="desktop-break" /> из наших. Теперь её очередь — твоя.</p>
        </div>

        <div className="catalog-toolbar">
          <div className="category-filters" aria-label="Категории книг">
            {categories.map((category) => (
              <button
                className={`filter-pill${activeCategory === category ? " filter-active" : ""}`}
                key={category}
                onClick={() => setActiveCategory(category)}
                type="button"
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
          <label className="sort-control">
            <span>Предложение:</span>
            <select
              value={activeDeal}
              onChange={(event) =>
                setActiveDeal(event.target.value as (typeof dealFilters)[number])
              }
              aria-label="Фильтр по типу предложения"
            >
              {dealFilters.map((deal) => <option key={deal}>{deal}</option>)}
            </select>
          </label>
        </div>

        <div className="catalog-count" aria-live="polite">
          <span>СВЕЖИЕ НАХОДКИ</span>
          <span>{filteredBooks.length.toString().padStart(2, "0")} {formatBookCount(filteredBooks.length)}</span>
        </div>

        {loadError ? (
          <div className="empty-state catalog-error" role="alert">
            <h3>Каталог пока недоступен</h3>
            <p>{loadError}</p>
            <button
              className="text-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </button>
          </div>
        ) : isLoading ? (
          <div className="empty-state" role="status">
            <p>Загружаем книги сообщества…</p>
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="book-grid">
            {filteredBooks.map((book) => (
              <BookCard
                book={book}
                isFavorite={favorites.includes(book.id)}
                key={book.id}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {books.length === 0 ? (
              <>
                <span aria-hidden="true">✳</span>
                <h3>Полка ждёт первую книгу</h3>
                <p>Нажми «Разместить книгу» вверху страницы — пусть она найдёт нового читателя.</p>
              </>
            ) : (
              <>
                <span aria-hidden="true">⌕</span>
                <h3>Пока ничего не нашли</h3>
                <p>Попробуй изменить запрос или выбрать другую категорию.</p>
                <button
                  className="text-button"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("Все книги");
                    setActiveDeal("Все предложения");
                  }}
                  type="button"
                >
                  Сбросить фильтры
                </button>
              </>
            )}
          </div>
        )}
        <div className="catalog-footer">
          <span>Новая глава начинается с одной книги</span>
          <a href="#how-it-works">Смотреть все книги <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="wishlist-section" id="wishlist">
        <div className="wishlist-heading">
          <div>
            <div className="eyebrow"><span /> книжные желания сообщества</div>
            <h2>Ищут <em>свою книгу</em></h2>
            <p>Кто-то рядом ищет именно то, что давно стоит у тебя на полке.</p>
          </div>
          <CreateWishlistButton
            googleConfigured={googleConfigured}
            onCreated={(request) => {
              setWishlistRequests((current) => [request, ...current]);
              setWishlistError("");
            }}
          />
        </div>

        {wishlistError ? (
          <div className="wishlist-message" role="alert">
            <p>{wishlistError}</p>
            <button type="button" className="text-button" onClick={() => window.location.reload()}>
              Попробовать снова
            </button>
          </div>
        ) : isWishlistLoading ? (
          <div className="wishlist-message" role="status">Загружаем заявки…</div>
        ) : wishlistRequests.length > 0 ? (
          <div className="wishlist-grid">
            {wishlistRequests.map((request) => {
              const contactHref = getContactHref(request.contactInfo);

              return (
                <article className="wishlist-card" key={request.id}>
                  <div className="wishlist-card-top">
                    <span className="wishlist-symbol" aria-hidden="true">“</span>
                    <time dateTime={request.createdAt}>{formatRequestDate(request.createdAt)}</time>
                  </div>
                  <p className="wishlist-card-kicker">ИЩУ КНИГУ</p>
                  <h3>{request.title}</h3>
                  {(request.author || request.category) && (
                    <p className="wishlist-card-details">
                      {[request.author, request.category].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {request.description && <p className="wishlist-card-description">{request.description}</p>}
                  <div className="wishlist-card-contact">
                    <span>Её ищет читатель</span>
                    {contactHref ? (
                      <a href={contactHref}>Откликнуться <span aria-hidden="true">↗</span></a>
                    ) : (
                      <span className="wishlist-contact-plain">{request.contactInfo}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="wishlist-empty">
            <span aria-hidden="true">✳</span>
            <p>Пока никто не оставил заявку. Начни первым — вдруг нужная книга уже рядом.</p>
          </div>
        )}
      </section>

      <section className="community-strip" id="community">
        <div className="community-mark" aria-hidden="true">✳</div>
        <div>
          <p className="community-kicker">НЕ ПРОСТО КНИЖНАЯ ПОЛКА</p>
          <h2>У каждой книги есть <em>своя история.</em></h2>
          <p>А у каждой встречи — шанс начать новую.</p>
        </div>
        <a href="#how-it-works">Присоединиться <span aria-hidden="true">↗</span></a>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="eyebrow"><span /> всё просто</div>
        <h2>Круговорот хороших <em>историй</em></h2>
        <div className="steps-grid">
          <article><span>01</span><h3>Найди свою</h3><p>Выбери книгу на полке сообщества — фильтруй по жанру или формату.</p></article>
          <article><span>02</span><h3>Договорись</h3><p>Свяжись с владельцем и выбери удобное место встречи в Актобе.</p></article>
          <article><span>03</span><h3>Передай дальше</h3><p>Прочитай, поделись впечатлениями и дай книге новую жизнь.</p></article>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark" aria-hidden="true">а.</span>
          <span className="brand-name">aqtobe<span>bookclub</span></span>
        </a>
        <span>Читаем вместе в Актобе <span aria-hidden="true">♥</span></span>
        <a href="#catalog">Книжная полка ↑</a>
      </footer>
    </main>
  );
}
