"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserAction,
  deleteUserAction,
  resetPasswordAction,
  type ActionResult,
} from "./actions";
import { TEMP_PASSWORD } from "@/lib/constants";
import type { Profile } from "@/lib/auth";

export default function AdminPanel({
  initialUsers,
  adminId,
}: {
  initialUsers: Profile[];
  adminId: string;
}) {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <AddUserForm />
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          {initialUsers.length} user{initialUsers.length === 1 ? "" : "s"}
        </h2>
        <ul className="flex flex-col gap-2">
          {initialUsers.map((u) => (
            <UserRow key={u.id} user={u} isSelf={u.id === adminId} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function AddUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createUserAction, null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-white">Add a user</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        They&apos;ll get the temporary password{" "}
        <span className="font-mono text-slate-300">{TEMP_PASSWORD}</span> and set
        their own on first login.
      </p>
      <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3">
        <input
          name="full_name"
          placeholder="Name (optional)"
          autoComplete="off"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-burnt-500"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          inputMode="email"
          autoCapitalize="none"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-burnt-500"
        />
        <input
          name="phone"
          type="tel"
          placeholder="Mobile number (for texting instructions)"
          inputMode="tel"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-burnt-500"
        />
        {state && !state.ok && state.error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            User created. Text or email them their login below.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-burnt-500 px-4 py-3 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create user"}
        </button>
      </form>
    </section>
  );
}

function appUrl(): string {
  return typeof window !== "undefined"
    ? window.location.origin
    : "https://ipf-knowledge-w9bq.vercel.app";
}

function buildInstructions(email: string): string {
  return [
    "IPF Knowledge — field app",
    "",
    "Tap this link on your phone to open the app:",
    appUrl(),
    "",
    "Your login:",
    `Email: ${email}`,
    `Temporary password: ${TEMP_PASSWORD}`,
    "(You'll set your own password on first sign-in.)",
    "",
    "Then add it to your home screen so it works like an app:",
    '• iPhone (Safari): tap the Share button, then "Add to Home Screen".',
    '• Android (Chrome): tap the ⋮ menu, then "Add to Home screen" (or "Install app").',
  ].join("\n");
}

function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const [delState, deleteAction, deleting] = useActionState<
    ActionResult | null,
    FormData
  >(deleteUserAction, null);

  const [resetState, resetAction, resetting] = useActionState<
    ActionResult | null,
    FormData
  >(resetPasswordAction, null);

  useEffect(() => {
    if (delState?.ok) router.refresh();
  }, [delState, router]);

  useEffect(() => {
    if (resetState?.ok) router.refresh();
  }, [resetState, router]);

  async function copyInstructions() {
    try {
      await navigator.clipboard.writeText(buildInstructions(user.email ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function textInstructions() {
    const phone = (user.phone ?? "").replace(/[^\d+]/g, "");
    const body = encodeURIComponent(buildInstructions(user.email ?? ""));
    // `?&` form works across iOS and Android SMS handlers.
    window.location.href = `sms:${phone}?&body=${body}`;
  }

  function emailInstructions() {
    const subject = encodeURIComponent("IPF Knowledge app — your login");
    const body = encodeURIComponent(buildInstructions(user.email ?? ""));
    window.location.href = `mailto:${user.email ?? ""}?subject=${subject}&body=${body}`;
  }

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {user.full_name?.trim() || user.email}
          </p>
          {user.full_name?.trim() && (
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          )}
          <p className="mt-0.5 text-xs text-slate-500">
            {user.phone?.trim() ? user.phone : "no phone"}
            {isSelf ? " · you (admin)" : ""}
          </p>
        </div>
        {user.must_change_password && !isSelf && (
          <span className="shrink-0 rounded-full bg-burnt-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-burnt-400">
            temp pw
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={textInstructions}
          disabled={!user.phone?.trim()}
          className="rounded-lg bg-burnt-500 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          Text
        </button>
        <button
          onClick={emailInstructions}
          className="rounded-lg bg-burnt-500 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95"
        >
          Email
        </button>
        <button
          onClick={copyInstructions}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition active:scale-95"
        >
          {copied ? "Copied!" : "Copy"}
        </button>

        {confirmingReset ? (
          <form action={resetAction} className="flex items-center gap-2">
            <input type="hidden" name="user_id" value={user.id} />
            <button
              type="submit"
              disabled={resetting}
              onClick={() => setConfirmingReset(false)}
              className="rounded-lg bg-burnt-600 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
            >
              {`Confirm reset to ${TEMP_PASSWORD}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={resetting}
            className="rounded-lg border border-burnt-500/40 px-3 py-1.5 text-xs font-medium text-burnt-400 transition active:scale-95 disabled:opacity-60"
          >
            {resetting ? "Resetting…" : "Reset password"}
          </button>
        )}

        {!isSelf &&
          (confirmingDelete ? (
            <form
              action={deleteAction}
              className="ml-auto flex items-center gap-2"
            >
              <input type="hidden" name="user_id" value={user.id} />
              <button
                type="submit"
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="ml-auto rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition active:scale-95"
            >
              Delete
            </button>
          ))}
      </div>

      {resetState?.ok && (
        <p className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Password reset to {TEMP_PASSWORD}. They&apos;ll set a new one on next
          login — text or email them.
        </p>
      )}
      {resetState && !resetState.ok && resetState.error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {resetState.error}
        </p>
      )}
      {delState && !delState.ok && delState.error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {delState.error}
        </p>
      )}
    </li>
  );
}
