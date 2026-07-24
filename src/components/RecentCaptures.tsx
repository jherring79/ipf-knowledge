"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Capture = {
  id: string;
  note: string | null;
  photo_paths: string[] | null;
  created_at: string;
  created_by_email: string | null;
};

type Row = Capture & { thumbUrl: string | null };

export default function RecentCaptures() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("captures")
        .select("id, note, photo_paths, created_at, created_by_email")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error || !data) {
        if (active) setRows([]);
        return;
      }

      const withThumbs: Row[] = await Promise.all(
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

      if (active) setRows(withThumbs);
    })();

    return () => {
      active = false;
    };
  }, []);

  if (rows === null) {
    return <p className="text-sm text-slate-500">Loading…</p>;
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
              {formatWhen(c.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
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
