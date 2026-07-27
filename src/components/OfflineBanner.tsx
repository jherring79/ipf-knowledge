"use client";

import { useOffline } from "./OfflineProvider";

/**
 * Thin bar pinned to the top of every screen. Two jobs:
 *  - tell the guy plainly that he has no service, and that saving still works
 *  - when service is back but photos are still queued, show it's uploading
 */
export default function OfflineBanner() {
  const { online, pending, syncing } = useOffline();

  if (online && pending === 0) return null;

  const offline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold ${
        offline
          ? "bg-burnt-600 text-white"
          : "bg-slate-800 text-slate-200 border-b border-slate-700"
      }`}
    >
      {offline ? (
        <>
          <NoSignalIcon />
          <span>
            No service — captures save to this phone
            {pending > 0 ? ` (${pending} waiting)` : ""}
          </span>
        </>
      ) : (
        <>
          {syncing ? <Spinner /> : <CloudIcon />}
          <span>
            {syncing
              ? `Uploading ${pending} capture${pending === 1 ? "" : "s"}…`
              : `${pending} capture${pending === 1 ? "" : "s"} waiting to upload`}
          </span>
        </>
      )}
    </div>
  );
}

function NoSignalIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M2 2l20 20M20 4v16M14 9v11M8 14v6M2 18v2" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 13v8M8 17l4-4 4 4" />
      <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.2" />
    </svg>
  );
}

export function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0 animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}
