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

Signed-in visitors can publish a book listing or post a book-wishlist request
from the homepage.

Book owners can mark their listings as found from the account page. Found books
remain visible in the catalog with a status label, but cannot receive new
inquiries until the owner returns them to the catalog.

Members can edit their own book listings (including replacing or removing a
photo) and wishlist requests from the account page.

Book photos are optional. JPG, PNG, and WebP images up to 5 MB are stored in
`public/uploads` for local development; that folder is ignored by Git. Local
uploads are not persistent storage for a future hosted deployment, which will
need an external image-storage service.

Contact details are not requested for new listings or wishlist requests.
Signed-in readers can send a private inquiry, and the author can reply using
the sender email shown only in their account inbox. Legacy contact details
remain stored locally but are not included in public API responses.

## Google sign-in

Add `AUTH_SECRET`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` to `.env`.
Generate a private secret with `npx auth secret`. Create a Google OAuth web
client in Google Cloud and add `http://localhost:3000/api/auth/callback/google`
as an authorized redirect URI. Add the deployed site's callback URL as well
when configuring production. Never commit `.env` or share the client secret.

The header links to sign-in and account management. New books and wishlist
requests require a signed-in Google account and are linked to that account;
members can remove their own new listings from the account page.
