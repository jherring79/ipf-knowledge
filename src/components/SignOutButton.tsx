"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation so the server clears the session cookie cleanly.
    window.location.assign("/login");
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
