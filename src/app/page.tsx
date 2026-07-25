import Link from "next/link";
import { requireUser } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import RecentCaptures from "@/components/RecentCaptures";
import Longhorns from "@/components/Longhorns";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { user, isAdmin } = await requireUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-6">
      <div className="flex justify-center pb-4 text-burnt-500">
        <Longhorns className="h-12 w-auto" />
      </div>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-widest text-burnt-500">
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
          className="group flex items-center gap-4 rounded-2xl border border-burnt-500/30 bg-gradient-to-br from-burnt-500/15 to-burnt-600/5 p-5 shadow-lg shadow-burnt-900/20 transition active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-burnt-500 text-white">
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
          <span className="ml-auto text-burnt-500">
            <ChevronIcon />
          </span>
        </Link>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 transition active:scale-[0.99]"
        >
          <UsersIcon />
          Manage users
          <span className="ml-auto text-slate-600">
            <ChevronIcon />
          </span>
        </Link>
      )}

      <Link
        href="/change-password"
        className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300 transition active:scale-[0.99]"
      >
        <KeyIcon />
        Change my password
        <span className="ml-auto text-slate-600">
          <ChevronIcon />
        </span>
      </Link>

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

function KeyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
    </svg>
  );
}
