import Link from "next/link";
import { requireUser } from "@/lib/auth";
import CaptureForm from "./CaptureForm";

export const metadata = { title: "Capture · IPF Knowledge" };
export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition active:scale-95"
          aria-label="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-white">Capture Knowledge</h1>
      </header>

      {/* Identity is baked into the page here rather than looked up in the
          browser, because the capture screen has to work with no signal: the
          service worker replays this cached HTML, and the queued capture still
          knows who took it. */}
      <CaptureForm userId={user!.id} userEmail={user!.email ?? null} />
    </main>
  );
}
