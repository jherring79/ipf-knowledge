"use client";

import { useOffline } from "./OfflineProvider";
import { Spinner } from "./OfflineBanner";

/**
 * Home-screen card: everything captured but not yet in the database, with a
 * manual "Sync now" so a guy who just pulled into town doesn't have to guess
 * whether it went through.
 */
export default function PendingUploads() {
  const { queue, pending, syncing, online, lastResult, syncNow } = useOffline();

  if (pending === 0) {
    return lastResult ? (
      <p className="mt-3 text-xs text-emerald-400">{lastResult}</p>
    ) : null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-burnt-500/30 bg-burnt-500/5 p-4">
      <div className="flex items-center gap-2">
        <span className="text-burnt-400">
          {syncing ? <Spinner /> : <UploadIcon />}
        </span>
        <h2 className="text-sm font-semibold text-white">
          {pending} capture{pending === 1 ? "" : "s"} waiting to upload
        </h2>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {online
          ? "Saved on this phone. Uploading automatically — you can leave this screen."
          : "Saved on this phone. They'll upload by themselves the moment you get service."}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {queue.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-200">
                {item.note.trim() || "(no note)"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {item.photos.length > 0
                  ? `${item.photos.length} photo${
                      item.photos.length === 1 ? "" : "s"
                    } · `
                  : ""}
                {formatWhen(item.createdAt)}
                {item.attempts > 0 ? ` · ${item.attempts} attempt${item.attempts === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              On phone
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => void syncNow()}
        disabled={syncing}
        className="mt-3 w-full rounded-xl border border-burnt-500/50 px-4 py-2.5 text-sm font-semibold text-burnt-400 transition active:scale-[0.99] disabled:opacity-50"
      >
        {syncing ? "Uploading…" : "Sync now"}
      </button>

      {lastResult && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {lastResult}
        </p>
      )}
    </section>
  );
}

function formatWhen(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function UploadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 13v8M8 17l4-4 4 4" />
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.2" />
    </svg>
  );
}
