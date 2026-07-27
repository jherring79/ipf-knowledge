"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOffline } from "./OfflineProvider";

type Capture = {
  id: string;
  note: string | null;
  photo_paths: string[] | null;
  created_at: string;
  captured_at: string | null;
  created_by_email: string | null;
};

type Row = Capture & { thumbUrl: string | null };

export default function RecentCaptures() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const { online, pending } = useOffline();

  useEffect(() => {
    // Offline is handled at render time -- no point asking the network.
    if (!online) return;

    let cancelled = false;

    // Re-reads whenever the queue drains, so a capture that just synced
    // appears in the shared list without a manual refresh.
    (async () => {
      const result = await fetchRecent();
      if (cancelled) return;
      setFetchFailed(!result);
      setRows(result ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [online, pending]);

  // This list is the shared, server-side record. Offline it simply isn't
  // available -- but the guy's own captures are, and PendingUploads shows them.
  if (!online) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
        No service — the shared list will show up when you&apos;re back in
        range. Anything you captured is saved on this phone.
      </p>
    );
  }

  if (rows === null) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (fetchFailed) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
        Couldn&apos;t reach the server just now. Your captures are safe.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
        Nothing captured yet. Tap{" "}
        <span className="text-slate-300">Capture Knowledge</span> to add your
        first photo and note.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((c) => (
        <li
          key={c.id}
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
            {c.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.thumbUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-600">
                <NoteIcon />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-slate-200">
              {c.note?.trim() || "(no note)"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {(c.photo_paths?.length ?? 0) > 0
                ? `${c.photo_paths!.length} photo${
                    c.photo_paths!.length === 1 ? "" : "s"
                  } · `
                : ""}
              {formatWhen(c.captured_at ?? c.created_at)}
              {wasQueued(c) ? " · captured offline" : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Returns the recent shared captures, or null if the server can't be reached. */
async function fetchRecent(): Promise<Row[] | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("captures")
    .select("id, note, photo_paths, created_at, captured_at, created_by_email")
    // Ordered by when it was actually taken in the field, not when it happened
    // to reach the server -- a capture made Tuesday with no signal still sits
    // in Tuesday's place after it syncs on Thursday.
    .order("captured_at", { ascending: false })
    .limit(15);

  if (error || !data) return null;

  return await Promise.all(
    (data as Capture[]).map(async (c) => {
      const first = c.photo_paths?.[0];
      let thumbUrl: string | null = null;
      if (first) {
        const { data: signed } = await supabase.storage
          .from("knowledge-photos")
          .createSignedUrl(first, 60 * 60);
        thumbUrl = signed?.signedUrl ?? null;
      }
      return { ...c, thumbUrl };
    }),
  );
}

// More than five minutes between taking it and it landing in the database
// means it sat in the offline queue.
function wasQueued(c: Capture): boolean {
  if (!c.captured_at) return false;
  const gap =
    new Date(c.created_at).getTime() - new Date(c.captured_at).getTime();
  return gap > 5 * 60 * 1000;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NoteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}
