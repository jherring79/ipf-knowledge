# IPF Knowledge

Field knowledge capture for **IP Filtration** — a dead-simple mobile web app to snap photos of units, business cards, or anything worth keeping, add a note, and store it all in one place so it's never lost.

Built with Next.js 16 (App Router) + Supabase (Auth, Postgres, Storage). Deploys on Vercel.

## What it does (v1)

- **Login** — invite-only. Each person gets their own account, so every capture is stamped with who took it.
- **Home** — one big **Capture Knowledge** button. (More buttons can be added here later.)
- **Capture Knowledge** — take photos with the camera or pull from the camera roll (multiple photos per capture), type a note, and save. A "Recent captures" list confirms it landed.

Everything is stored in Supabase (photos in a private Storage bucket, notes + metadata in Postgres). A future step can push each capture out to a destination folder (e.g. Google Drive).

## Works with no service (v2)

Half the places worth capturing — SWD sites, lease roads, the yard — have no signal. The app is built so that never matters.

- **The app opens with no bars.** A service worker (`public/sw.js`) keeps a copy of the home and capture screens, so tapping the home-screen icon out of range brings up the app, not a browser error. Requires the app to have been opened online at least once, and to be added to the home screen.
- **Save always writes to the phone first.** Every capture goes into IndexedDB (`src/lib/offline/db.ts`) *before* any network call — so a connection that dies mid-upload can't lose a photo. Uploading is a separate, retryable step.
- **Photos are shrunk on capture** to 1600 px on the long edge, JPEG q0.82 (`src/lib/offline/image.ts`). A 3–4 MB camera photo becomes ~250–400 KB: many more captures fit on the phone, and uploads finish on one bar. Nameplates and serial stamps stay readable. Anything that fails to decode is queued at full size rather than dropped.
- **Sync happens by itself** (`src/lib/offline/sync.ts`) when service returns, when the app is reopened, and on a 45-second retry timer while anything is still waiting. `navigator.onLine` is not trusted on its own — it reports "online" on a dead connection, which is why the timer exists. There's also a manual **Sync now** button.
- **Sync is idempotent.** Storage paths are derived from the capture id, and the row uses that same id as its primary key, so a retry after a half-finished upload resumes rather than duplicating. "Already exists" and duplicate-key responses are treated as success. Uploads checkpoint after each photo.
- **`captured_at` vs `created_at`.** `captured_at` is when the photo was taken in the field; `created_at` is when it reached the database. A capture taken Tuesday with no signal still sorts under Tuesday after it syncs on Thursday, and the list marks it "captured offline".
- **Signing out with captures still queued** asks for confirmation first, and clears the cached per-user screens from the service worker.

**Known limit:** iOS does not run background sync for web apps. On an iPhone, queued captures upload when the app is open (which the retry timer handles within seconds of regaining service) — not while it sits closed in a pocket. Nothing is lost either way; it just needs the app opened once back in range. Android/Chrome behaves the same way here by design, rather than depending on a Background Sync API that iOS lacks.

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
