"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  listQueue,
  QUEUE_CHANGED,
  requestPersistentStorage,
  type QueuedCapture,
} from "@/lib/offline/db";
import { flushQueue, SYNC_STATE_CHANGED, isSyncing } from "@/lib/offline/sync";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

type OfflineContextValue = {
  online: boolean;
  queue: QueuedCapture[];
  pending: number;
  syncing: boolean;
  lastResult: string | null;
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue>({
  online: true,
  queue: [],
  pending: 0,
  syncing: false,
  lastResult: null,
  syncNow: async () => {},
  refresh: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

/** How often to retry while something is still stuck in the queue. */
const RETRY_INTERVAL_MS = 45_000;

export default function OfflineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const online = useOnlineStatus();
  const [queue, setQueue] = useState<QueuedCapture[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setQueue(await listQueue());
    } catch {
      setQueue([]);
    }
  }, []);

  const syncNow = useCallback(async () => {
    const result = await flushQueue();
    await refresh();

    if (result.skipped) {
      if (result.reason === "offline") setLastResult("No service yet.");
      else if (result.reason === "no-session")
        setLastResult("Couldn't reach the server. Will keep trying.");
      return;
    }
    if (result.uploaded > 0 && result.failed === 0) {
      setLastResult(
        `Uploaded ${result.uploaded} capture${
          result.uploaded === 1 ? "" : "s"
        }.`,
      );
    } else if (result.failed > 0) {
      setLastResult(
        `${result.failed} capture${
          result.failed === 1 ? "" : "s"
        } didn't go through. Still saved on this phone.`,
      );
    }
  }, [refresh]);

  // Register the service worker so the app opens with no signal, and ask the
  // browser to keep queued photos even under storage pressure.
  useEffect(() => {
    void requestPersistentStorage();

    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* No offline shell on this browser; the capture queue still works. */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  // Load the queue and take a first run at draining it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
      await syncNow();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, syncNow]);

  // Drain the queue whenever service comes back or the guy reopens the app.
  useEffect(() => {
    const onOnline = () => void syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void syncNow();
      }
    };
    const onQueueChanged = () => void refresh();
    const onSyncState = () => setSyncing(isSyncing());

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(QUEUE_CHANGED, onQueueChanged);
    window.addEventListener(SYNC_STATE_CHANGED, onSyncState);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(QUEUE_CHANGED, onQueueChanged);
      window.removeEventListener(SYNC_STATE_CHANGED, onSyncState);
    };
  }, [refresh, syncNow]);

  // Keep retrying on a timer while anything is still waiting. `navigator.onLine`
  // lies in the field -- it reports true on a dead one-bar connection -- so a
  // periodic retry is what actually drains the queue on the drive back to town.
  useEffect(() => {
    if (queue.length === 0) return;

    const timer = setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [queue.length, syncNow]);

  return (
    <OfflineContext.Provider
      value={{
        online,
        queue,
        pending: queue.length,
        syncing,
        lastResult,
        syncNow,
        refresh,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
