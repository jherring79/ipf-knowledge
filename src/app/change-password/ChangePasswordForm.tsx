"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearPasswordFlag } from "./actions";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      setError(updErr.message);
      setBusy(false);
      return;
    }

    try {
      const res = await clearPasswordFlag();
      if (!res.ok) {
        setError(res.error ?? "Could not finish setup. Try again.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Could not finish setup. Please try again.");
      setBusy(false);
      return;
    }

    // The auth token just changed. A hard navigation lets the server re-read
    // the fresh session cleanly and avoids a client-router hang after refresh.
    window.location.assign("/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-burnt-500"
          placeholder="At least 6 characters"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-300">
          Confirm password
        </span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-burnt-500"
          placeholder="Re-enter it"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-xl bg-burnt-500 px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save password & continue"}
      </button>
    </form>
  );
}
