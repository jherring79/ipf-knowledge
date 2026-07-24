import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import RecentCaptures from "@/components/RecentCaptures";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-widest text-amber-500">
            IP FILTRATION
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-white">
            Knowledge Capture
          </h1>
        </div>
        <SignOutButton />
      </header>

      <p className="mt-1 text-sm text-slate-400">Signed in as {user?.email}</p>

      <div className="mt-8">
        <Link
          href="/capture"
          className="group flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-600/5 p-5 shadow-lg shadow-amber-900/20 transition active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
            <CameraIcon />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold text-white">
              Capture Knowledge
            </span>
            <span className="text-sm text-slate-400">
              Photos + notes from the field
            </span>
          </span>
          <span className="ml-auto text-amber-500">
            <ChevronIcon />
          </span>
        </Link>
      </div>

      <section className="mt-10 flex-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Recent captures
        </h2>
        <div className="mt-3">
          <RecentCaptures />
        </div>
      </section>

      <footer className="safe-b pt-8 text-center text-xs text-slate-600">
        IPF Knowledge · captured knowledge, never lost
      </footer>
    </main>
  );
}

function CameraIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
