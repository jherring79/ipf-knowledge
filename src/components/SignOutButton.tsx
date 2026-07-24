"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition active:scale-95 disabled:opacity-50"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}
