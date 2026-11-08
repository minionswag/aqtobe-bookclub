"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AccountButton } from "@/app/components/account-button";
import { CreateBookButton } from "@/app/components/create-book-button";
import { CreateWishlistButton } from "@/app/components/create-wishlist-button";
import { ContactBookButton } from "@/app/components/contact-book-button";
import type { BookListing, DealType as ListingDealType } from "@/lib/book-types";
import type { WishlistListing } from "@/lib/wishlist-types";

type DealType = "Обмен" | "Продажа" | "Аренда";
type SortOption = "newest" | "price-low" | "price-high" | "title";

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

const categoryNotes: Record<string, string> = {
  "Художественная": "Романы, рассказы и большие истории",
  "Саморазвитие": "Идеи для роста и новых привычек",
  "Нон-фикшн": "Факты, исследования и живой опыт",
};

const tickerWords = ["Обмен", "Продажа", "Аренда", "Актобе", "Без комиссии", "Книги рядом"];

function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((group) => (
          <div className="ticker-group" key={group}>
            {[...tickerWords, ...tickerWords].map((word, index) => (
              <span key={index}>{word}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

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
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    typeof value.isFound === "boolean" &&
    typeof value.canReceiveInquiries === "boolean" &&
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
    typeof value.canReceiveInquiries === "boolean" &&
    typeof value.createdAt === "string"
  );
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

function FeatureIcon({ kind }: { kind: "near" | "safe" | "free" | "cycle" }) {
  if (kind === "near") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2.1" />
      </svg>
    );
  }

  if (kind === "safe") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.5 2.7 8.1 7 10 4.3-1.9 7-5.5 7-10V6l-7-3Z" />
        <path d="m9.4 12 1.7 1.7 3.7-4" />
      </svg>
    );
  }

  if (kind === "free") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.8 15.2 15.2 8.8M8.8 8.8l6.4 6.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.2 7.4A6.8 6.8 0 0 1 18.4 10M18.4 10V5.8M18.4 10h-4.2" />
      <path d="M16.8 16.6A6.8 6.8 0 0 1 5.6 14M5.6 14v4.2M5.6 14h4.2" />
    </svg>
  );
}

function BookCard({
  book,
  isFavorite,
  onToggleFavorite,
  googleConfigured,
  index,
  featured,
}: {
  book: Book;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  googleConfigured: boolean;
  index: number;
  featured: boolean;
}) {
  return (
    <article
      className={`book-card${book.isFound ? " is-found" : ""}${featured ? " is-featured" : ""}`}
      style={{ "--i": index } as CSSProperties}
    >
      <div
        className={`book-cover${book.imageUrl ? " has-image" : ""}`}
        style={
          {
            "--cover": book.cover,
            "--cover-accent": book.coverAccent,
          } as CSSProperties
        }
      >
        {book.imageUrl ? (
          <Image
            className="book-photo"
            src={book.imageUrl}
            alt={`Обложка книги «${book.title}»`}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
            unoptimized={book.imageUrl.startsWith("https://")}
          />
        ) : (
          <>
            <span className="cover-label">{book.label}</span>
            <span className="cover-title">{book.initials}</span>
            <span className="cover-author">{book.author}</span>
          </>
        )}
        {book.isFound && <span className="book-found-tag">Книгу нашли</span>}
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
          <ContactBookButton
            targetId={book.id}
            targetType="book"
            targetTitle={book.title}
            canReceiveInquiries={book.canReceiveInquiries && !book.isFound}
            googleConfigured={googleConfigured}
          />
        </div>
        <p className="book-contact">Напиши владельцу через защищённую форму — контакты не публикуются.</p>
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
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [wishlistRequests, setWishlistRequests] = useState<WishlistListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [wishlistError, setWishlistError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все книги");
  const [activeDeal, setActiveDeal] = useState<(typeof dealFilters)[number]>("Все предложения");
  const [activeDistrict, setActiveDistrict] = useState("");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [favorites, setFavorites] = useState<string[]>([]);
  const shellRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void fetch("/api/favorites")
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (
          isCurrent &&
          Array.isArray(result.bookIds) &&
          result.bookIds.every((id: unknown) => typeof id === "string")
        ) {
          setFavorites(result.bookIds);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || !("IntersectionObserver" in window)) return;

    shell.setAttribute("data-reveal-ready", "");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );
    shell.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

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
    const minimum = minimumPrice === "" ? null : Number(minimumPrice);
    const maximum = maximumPrice === "" ? null : Number(maximumPrice);

    const result = books.filter((book) => {
      const matchesSearch =
        !query ||
        `${book.title} ${book.author} ${book.category} ${book.district}`
          .toLocaleLowerCase("ru")
          .includes(query);
      const matchesCategory =
        activeCategory === "Все книги" || book.category === activeCategory;
      const matchesDeal = activeDeal === "Все предложения" || book.dealType === activeDeal;
      const matchesDistrict =
        !activeDistrict || book.district.trim().toLocaleLowerCase("ru") === activeDistrict;
      const matchesPrice =
        (minimum === null && maximum === null) ||
        (book.price !== null &&
          (minimum === null || book.price >= minimum) &&
          (maximum === null || book.price <= maximum));

      return matchesSearch && matchesCategory && matchesDeal && matchesDistrict && matchesPrice;
    });

    return result.sort((left, right) => {
      if (sortOption === "title") return left.title.localeCompare(right.title, "ru");
      if (sortOption === "price-low") {
        return (left.price ?? Number.POSITIVE_INFINITY) - (right.price ?? Number.POSITIVE_INFINITY);
      }
      if (sortOption === "price-high") return (right.price ?? -1) - (left.price ?? -1);
      return 0;
    });
  }, [activeCategory, activeDeal, activeDistrict, books, maximumPrice, minimumPrice, search, sortOption]);

  const districts = useMemo(
    () =>
      [...new Set(books.map((book) => book.district.trim()).filter(Boolean))].sort((left, right) =>
        left.localeCompare(right, "ru"),
      ),
    [books],
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    activeCategory !== "Все книги" ||
    activeDeal !== "Все предложения" ||
    activeDistrict !== "" ||
    minimumPrice !== "" ||
    maximumPrice !== "";

  function resetFilters() {
    setSearch("");
    setActiveCategory("Все книги");
    setActiveDeal("Все предложения");
    setActiveDistrict("");
    setMinimumPrice("");
    setMaximumPrice("");
    setSortOption("newest");
  }

  async function toggleFavorite(bookId: string) {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (!response.ok) return;
    const result = await response.json();
    if (typeof result.favorite !== "boolean") return;
    setFavorites((current) =>
      result.favorite ? [...new Set([...current, bookId])] : current.filter((id) => id !== bookId),
    );
  }

  return (
    <main className="site-shell" ref={shellRef}>
      <div className="announcement">
        <span className="announcement-label">Локальное книжное сообщество</span>
        <span>Меняй, продавай и находи книги рядом</span>
        <span className="announcement-city">АКТОБЕ · КАЗАХСТАН</span>
      </div>

      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
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
          <div className="eyebrow"><span /> книжный маркетплейс Актобе</div>
          <h1>
            Новая жизнь
            <br />для <em>хороших книг.</em>
          </h1>
          <p className="hero-description">
            Находи книги у людей рядом, договаривайся об обмене или покупке
            и собирай личную библиотеку осознанно.
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
            <span><strong>Сообщество читателей</strong><br />без комиссий и лишних посредников</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-photo-frame">
            <Image
              src="/hero-library.jpg"
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 86vw, 46vw"
            />
          </div>
          <div className="hero-visual-card">
            <span>Идея клуба</span>
            <strong>Прочитал —<br />передай дальше.</strong>
          </div>
          <div className="hero-stat-card">
            <strong>01</strong>
            <span>город<br />тысячи историй</span>
          </div>
          <div className="hero-roundel">
            <span>READ · SHARE · REPEAT</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 12h10M13 8l4 4-4 4" />
            </svg>
          </div>
          <div className="hero-book-object">
            <span />
            <span />
            <span />
          </div>
          <span className="photo-credit">Clay Banks · Unsplash</span>
        </div>
        <span className="hero-bigword" aria-hidden="true">bookclub</span>
        <div className="hero-stats">
          <div>
            <strong>{isLoading ? "—" : books.length.toString().padStart(2, "0")}</strong>
            <span>книг на полке</span>
          </div>
          <div>
            <strong>{isLoading ? "—" : districts.length.toString().padStart(2, "0")}</strong>
            <span>районов города</span>
          </div>
          <div>
            <strong>{isWishlistLoading ? "—" : wishlistRequests.length.toString().padStart(2, "0")}</strong>
            <span>заявок читателей</span>
          </div>
          <div>
            <strong>0 ₸</strong>
            <span>комиссия сервиса</span>
          </div>
        </div>
        <a className="scroll-hint" href="#catalog"><span /> листай к книгам</a>
      </section>

      <Ticker />

      <section className="benefit-rail" aria-label="Преимущества книжного клуба" data-reveal>
        <article>
          <span className="benefit-icon"><FeatureIcon kind="near" /></span>
          <div><strong>Всё рядом</strong><p>Книги от читателей из Актобе</p></div>
        </article>
        <article>
          <span className="benefit-icon"><FeatureIcon kind="safe" /></span>
          <div><strong>Безопасный контакт</strong><p>Личные данные не видны в каталоге</p></div>
        </article>
        <article>
          <span className="benefit-icon"><FeatureIcon kind="free" /></span>
          <div><strong>Без комиссии</strong><p>Договаривайтесь напрямую</p></div>
        </article>
        <article>
          <span className="benefit-icon"><FeatureIcon kind="cycle" /></span>
          <div><strong>Осознанное чтение</strong><p>Книги продолжают путешествие</p></div>
        </article>
      </section>

      <section className="catalog-section" id="catalog">
        <div className="section-heading" data-reveal>
          <div>
            <div className="eyebrow"><span /> полка сообщества</div>
            <h2>Книги ищут <em>читателей</em></h2>
          </div>
          <p>Каждая книга здесь уже прочитана кем-то<br className="desktop-break" /> из наших. Теперь её очередь — твоя.</p>
        </div>

        <div className="category-showcase" aria-label="Популярные разделы">
          {categories.slice(1).map((category, index) => (
            <button
              className={`category-showcase-card${activeCategory === category ? " is-active" : ""}`}
              type="button"
              key={category}
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              <span className="category-card-number">0{index + 1}</span>
              <span className={`category-book-object category-object-${index + 1}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="category-card-copy">
                <strong>{category}</strong>
                <small>{categoryNotes[category]}</small>
              </span>
              <span className="category-card-arrow" aria-hidden="true">→</span>
            </button>
          ))}
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
            <span>Сортировка:</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
              aria-label="Сортировка книг"
            >
              <option value="newest">Сначала новые</option>
              <option value="price-low">Сначала дешевле</option>
              <option value="price-high">Сначала дороже</option>
              <option value="title">По названию</option>
            </select>
          </label>
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

        <div className="catalog-extra-filters">
          <label className="district-filter">
            <span>Район:</span>
            <select
              value={activeDistrict}
              onChange={(event) => setActiveDistrict(event.target.value)}
              aria-label="Фильтр по району"
            >
              <option value="">Все районы</option>
              {districts.map((district) => (
                <option key={district} value={district.toLocaleLowerCase("ru")}>
                  {district}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="price-filter">
            <legend>Цена, ₸:</legend>
            <label>
              <span className="visually-hidden">Цена от</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="от"
                value={minimumPrice}
                onChange={(event) => setMinimumPrice(event.target.value)}
                aria-label="Минимальная цена в тенге"
              />
            </label>
            <span aria-hidden="true">—</span>
            <label>
              <span className="visually-hidden">Цена до</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="до"
                value={maximumPrice}
                onChange={(event) => setMaximumPrice(event.target.value)}
                aria-label="Максимальная цена в тенге"
              />
            </label>
            <span className="price-filter-note">Обмен без цены не включается</span>
          </fieldset>
          {hasActiveFilters && (
            <button className="filter-reset-button" onClick={resetFilters} type="button">
              Сбросить фильтры
            </button>
          )}
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
            {filteredBooks.map((book, index) => (
              <BookCard
                book={book}
                index={index}
                featured={index === 0 && !hasActiveFilters && filteredBooks.length > 2}
                isFavorite={favorites.includes(book.id)}
                googleConfigured={googleConfigured}
                key={book.id}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {books.length === 0 ? (
              <>
                <span aria-hidden="true">01</span>
                <h3>Полка ждёт первую книгу</h3>
                <p>Нажми «Разместить книгу» вверху страницы — пусть она найдёт нового читателя.</p>
              </>
            ) : (
              <>
                <span aria-hidden="true">⌕</span>
                <h3>Пока ничего не нашли</h3>
                <p>Попробуй изменить параметры поиска или сбросить фильтры.</p>
                <button
                  className="text-button"
                  onClick={resetFilters}
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
        <div className="wishlist-heading" data-reveal>
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
            {wishlistRequests.map((request) => (
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
                  <ContactBookButton
                    targetId={request.id}
                    targetType="wishlist"
                    targetTitle={request.title}
                    canReceiveInquiries={request.canReceiveInquiries}
                    googleConfigured={googleConfigured}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="wishlist-empty">
            <span aria-hidden="true">✳</span>
            <p>Пока никто не оставил заявку. Начни первым — вдруг нужная книга уже рядом.</p>
          </div>
        )}
      </section>

      <section className="community-strip" id="community">
        <div className="community-mark" aria-hidden="true">ABC</div>
        <div>
          <p className="community-kicker">НЕ ПРОСТО КНИЖНАЯ ПОЛКА</p>
          <h2>У каждой книги есть <em>своя история.</em></h2>
          <p>А у каждой встречи — шанс начать новую.</p>
        </div>
        <div className="community-books" aria-hidden="true">
          <span><i>01</i></span>
          <span><i>02</i></span>
          <span><i>03</i></span>
        </div>
        <a href="#how-it-works">Присоединиться <span aria-hidden="true">↗</span></a>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="eyebrow"><span /> всё просто</div>
        <h2>Круговорот хороших <em>историй</em></h2>
        <div className="steps-grid" data-reveal>
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
