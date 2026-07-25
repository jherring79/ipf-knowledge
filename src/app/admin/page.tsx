import Link from "next/link";
import { requireAdmin, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AdminPanel from "./AdminPanel";

export const metadata = { title: "Users · IPF Knowledge" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const users = (data as Profile[] | null) ?? [];

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
        <div>
          <h1 className="text-lg font-semibold text-white">Manage users</h1>
          <p className="text-xs text-slate-500">Admin · {session.user!.email}</p>
        </div>
      </header>

      <AdminPanel initialUsers={users} adminId={session.user!.id} />
    </main>
  );
}
