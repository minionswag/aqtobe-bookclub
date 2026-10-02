# Aqtobe BookClub

Next.js App Router project with TypeScript, Tailwind CSS, and Prisma ORM.

## Getting started

Install dependencies. SQLite is configured for local development, so no
separate database server is required:

```env
DATABASE_URL="file:./dev.db"
```

Create the local database, generate the Prisma Client, and start the development server:

```bash
npm run db:push
npm run db:generate
npm run dev
```

Use `npm run db:push` to sync the Prisma schema to your development database,
or `npm run db:studio` to open Prisma Studio.

The database schema is in [`prisma/schema.prisma`](./prisma/schema.prisma).
The book catalog is stored in the local `prisma/dev.db` SQLite database.

Visitors can publish a book listing or post a book-wishlist request from the
homepage. Wishlist requests are shown publicly with the submitter's contact
information; the form asks for consent before publishing it.

## Google sign-in

Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` to `.env`.
Generate a private secret with `npx auth secret`. Create a Google OAuth web
client in Google Cloud and add `http://localhost:3000/api/auth/callback/google`
as an authorized redirect URI. Add the deployed site's callback URL as well
when configuring production. Never commit `.env` or share the client secret.

The header links to sign-in and account management. New books and wishlist
requests require a signed-in Google account and are linked to that account;
members can remove their own new listings from the account page.
