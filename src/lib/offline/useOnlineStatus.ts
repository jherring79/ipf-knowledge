"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// On the server we assume online so the first paint has no offline banner.
function getServerSnapshot() {
  return true;
}

/**
 * Live connectivity flag.
 *
 * Worth knowing: `navigator.onLine` only means "this device has a network
 * interface up." Out in the Permian it will happily report true on a dead
 * one-bar connection, which is why the sync engine also retries on a timer
 * rather than trusting this alone.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
