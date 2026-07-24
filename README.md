# IPF Knowledge

Field knowledge capture for **IP Filtration** — a dead-simple mobile web app to snap photos of units, business cards, or anything worth keeping, add a note, and store it all in one place so it's never lost.

Built with Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage). Deploys on Vercel.

## What it does (v1)

- **Login** — invite-only. Each person gets their own account, so every capture is stamped with who took it.
- **Home** — one big **Capture Knowledge** button. (More buttons can be added here later.)
- **Capture Knowledge** — take photos with the camera or pull from the camera roll (multiple photos per capture), type a note, and save. A "Recent captures" list confirms it landed.

Everything is stored in Supabase (photos in a private Storage bucket, notes + metadata in Postgres). A future step can push each capture out to a destination folder (e.g. Google Drive).

## Tech

| Layer | What |
|------|------|
| Framework | Next.js 16, TypeScript, Tailwind CSS |
| Auth | Supabase Auth (email + password, invite-only) |
| Database | Supabase Postgres — `captures` table, row-level security |
| Photos | Supabase Storage — private `knowledge-photos` bucket |
| Hosting | Vercel |

## Environment variables

Copy `.env.example` to `.env.local` and fill in (these are the Supabase project's publishable values — safe to expose):

```
NEXT_PUBLIC_SUPABASE_URL=https://xsddwkkowulatcxeqaur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

The Supabase project (`ipf-knowledge`, Warhorse org) is already created with the schema, storage bucket, and security policies applied.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel → **Add New → Project** → import the repo.
3. Add the two environment variables above.
4. Deploy. Open the URL on your phone and "Add to Home Screen".

## Adding people (invite-only)

There is no public sign-up. Add users in the Supabase dashboard:

**Authentication → Users → Add user → Create new user** → enter email + password → check **Auto Confirm User** → Create. Share those credentials with the person; they can sign in immediately.

## Data model

`captures`
- `id` uuid
- `created_at` timestamptz
- `created_by` uuid → auth.users
- `created_by_email` text
- `note` text
- `photo_paths` text[] — storage paths in `knowledge-photos`

Photos live at `knowledge-photos/<user-id>/<capture-id>/<nn>.<ext>`. Any signed-in teammate can view all captures (institutional knowledge); you can only create/edit/delete under your own account.
