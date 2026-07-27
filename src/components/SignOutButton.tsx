"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOffline } from "./OfflineProvider";

export default function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { pending } = useOffline();

  async function signOut() {
    // Signing out with captures still on the phone would strand them: the
    // queue is tied to this user and nothing can upload it until they're back
    // in. Make them say yes on purpose.
    if (pending > 0 && !confirming) {
      setConfirming(true);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();

    // Drop the cached per-user screens so the next person to sign in on this
    // phone never sees the last one's home page.
    try {
      const reg = await navigator.serviceWorker?.ready;
      reg?.active?.postMessage({ type: "CLEAR_PAGE_CACHE" });
    } catch {
      /* no service worker; nothing cached to clear */
    }

    // Hard navigation so the server clears the session cookie cleanly.
    window.location.assign("/login");
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <p className="max-w-[11rem] text-right text-[11px] leading-tight text-burnt-400">
          {pending} capture{pending === 1 ? "" : "s"} still on this phone. Sign
          out anyway?
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300"
          >
            Stay
          </button>
          <button
            onClick={signOut}
            disabled={busy}
            className="rounded-lg border border-red-500/50 px-2.5 py-1 text-xs font-medium text-red-300 disabled:opacity-50"
          >
            {busy ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    );
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
