# Aqtobe BookClub

Next.js App Router project with TypeScript, Tailwind CSS, and Prisma ORM.

## Local development

Install dependencies. SQLite is configured for local development, so no
separate database server is required:

```env
DATABASE_URL="file:./dev.db"
```

Generate both Prisma clients, sync the local SQLite schema, and start the development server:

```bash
npm run db:generate
npm run db:push
npm run dev
```

`prisma/schema.local.prisma` is used for local SQLite development. The
PostgreSQL production schema is in `prisma/schema.prisma`. Use
`npm run db:studio` to open Prisma Studio.

The database schema is in [`prisma/schema.prisma`](./prisma/schema.prisma).
The book catalog is stored in the local `prisma/dev.db` SQLite database.

Signed-in visitors can publish a book listing or post a book-wishlist request
from the homepage.

Book owners can mark their listings as found from the account page. Found books
remain visible in the catalog with a status label, but cannot receive new
inquiries until the owner returns them to the catalog.

Members can edit their own book listings (including replacing or removing a
photo) and wishlist requests from the account page.

Book photos are optional. JPG, PNG, and WebP images up to 5 MB are stored in
`public/uploads` for local development; that folder is ignored by Git. Local
uploads are stored in Supabase Storage in production.

Contact details are not requested for new listings or wishlist requests.
Signed-in readers can send a private inquiry and continue the conversation
with the listing author in the account page. Both participants can reopen the
same chat; messages are visible only to them. The account page shows unread
message counts for each conversation and refreshes them automatically. The
sender email is shown only to the listing author as an optional alternative
contact. Legacy contact details remain stored locally but are not included in
public API responses.

Members can save books to server-backed favorites from the catalog and edit
their display name, city, and short bio in the account page. New inquiries and
chat messages create in-app notifications visible from the account page.

## Google sign-in

Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` to `.env`.
Generate a private secret with `npx auth secret`. Create a Google OAuth web
client in Google Cloud and add `http://localhost:3000/api/auth/callback/google`
as an authorized redirect URI. Add the deployed site's callback URL as well
when configuring production. Never commit `.env` or share the client secret.

The header links to sign-in and account management. New books and wishlist
requests require a signed-in Google account and are linked to that account;
members can remove their own new listings from the account page.

## Production deployment

The production setup uses Vercel for the Next.js application and Supabase for
managed PostgreSQL and public book-photo storage. Local development continues
to use SQLite. Configure these server-side environment variables in Vercel:

- `DATABASE_PROVIDER=postgres`
- `DATABASE_URL` — Supabase PostgreSQL connection string. Use a persistent
  connection-pooler connection for the app.
- `SUPABASE_URL` — the project URL, for example `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service-role secret; never use a
  `NEXT_PUBLIC_` name or expose it to the browser.
- `SUPABASE_STORAGE_BUCKET=book-photos`
- `AUTH_URL` — the deployed site URL
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET`

Create a public Supabase Storage bucket named `book-photos` and allow JPG, PNG,
and WebP files up to 5 MB. The application uploads and removes images using
the service-role key on the server only.

After configuring a local `.env` with the Supabase URL, service-role key, and
`PRODUCTION_DATABASE_URL`, prepare the empty Supabase database with:

```bash
npm run db:generate
npm run db:push:production
npm run db:migrate:supabase
```

The migration script refuses to run against a non-empty target database. It
copies users, linked Google accounts, books, wishlist requests, private
inquiries, chat messages, and read states; uploads local book photos; and
preserves photo references. It does not copy active login sessions, so sign in
again after deployment. Run the migration from a trusted local machine, never
with production credentials committed to Git or shown in shared logs.
