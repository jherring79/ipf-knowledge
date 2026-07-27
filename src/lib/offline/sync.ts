"use client";

import { createClient } from "@/lib/supabase/client";
import {
  listQueue,
  removeQueued,
  updateQueued,
  announceQueueChange,
  type QueuedCapture,
} from "./db";

const BUCKET = "knowledge-photos";

export const SYNC_STATE_CHANGED = "ipf:sync-state";

export type SyncResult = {
  uploaded: number;
  failed: number;
  skipped: boolean;
  reason?: string;
};

let running = false;

export function isSyncing() {
  return running;
}

function announceSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_STATE_CHANGED));
  }
}

/**
 * Push everything sitting in the offline queue up to Supabase.
 *
 * Safe to call often -- it no-ops when offline or already running. Each item
 * is independent: one bad capture never blocks the rest of the queue.
 */
export async function flushQueue(): Promise<SyncResult> {
  // Claim the lock BEFORE the first await. Several things can kick off a sync
  // at once -- the online event, the app becoming visible, the retry timer,
  // and the save button -- and if the guard were set after an await, two runs
  // would race through the same queue and upload every photo twice.
  if (running) return { uploaded: 0, failed: 0, skipped: true, reason: "busy" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { uploaded: 0, failed: 0, skipped: true, reason: "offline" };
  }
  running = true;

  let uploaded = 0;
  let failed = 0;

  try {
    const queue = await listQueue();
    if (queue.length === 0) {
      return { uploaded: 0, failed: 0, skipped: true, reason: "empty" };
    }

    announceSync();
    const supabase = createClient();

    // One auth check for the whole run. If the session can't be established
    // (still no real connectivity, or the refresh token needs the network),
    // leave the queue untouched and try again later.
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return {
        uploaded: 0,
        failed: 0,
        skipped: true,
        reason: "no-session",
      };
    }

    for (const item of queue) {
      try {
        await pushOne(supabase, item, user.id, user.email ?? null);
        await removeQueued(item.id);
        uploaded++;
      } catch (e) {
        failed++;
        await updateQueued({
          ...item,
          attempts: item.attempts + 1,
          lastError: e instanceof Error ? e.message : "Upload failed",
        });
        // Network died mid-run -- stop and keep the rest queued.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          break;
        }
      }
    }
  } finally {
    running = false;
    announceSync();
    announceQueueChange();
  }

  return { uploaded, failed, skipped: false };
}

type SupabaseClient = ReturnType<typeof createClient>;

async function pushOne(
  supabase: SupabaseClient,
  item: QueuedCapture,
  userId: string,
  userEmail: string | null,
) {
  // Mutated in place, so if this throws partway the caller writes back the
  // photos that DID make it -- the next attempt picks up where this one died
  // instead of re-sending everything over a weak connection.
  for (let i = item.uploadedPaths.length; i < item.photos.length; i++) {
    const photo = item.photos[i];
    const ext = extFor(photo.type);
    const path = `${userId}/${item.id}/${String(i).padStart(2, "0")}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, photo.blob, {
        contentType: photo.type || "image/jpeg",
        upsert: false,
      });

    if (error && !isAlreadyExists(error)) {
      throw new Error(`Photo ${i + 1} failed: ${error.message}`);
    }

    // Either it uploaded, or a previous attempt already put it there. The
    // path is derived from the capture id, so a retry lands on the same
    // object rather than creating a second copy.
    item.uploadedPaths.push(path);
    await updateQueued(item);
  }

  const { error: insErr } = await supabase.from("captures").insert({
    id: item.id,
    note: item.note.trim() || null,
    photo_paths: item.uploadedPaths,
    created_by: userId,
    created_by_email: item.userEmail ?? userEmail,
    captured_at: new Date(item.createdAt).toISOString(),
  });

  // A duplicate key means a previous attempt inserted the row and only the
  // local cleanup failed. That is a success, not an error.
  if (insErr && !isDuplicateRow(insErr)) {
    throw new Error(insErr.message);
  }
}

function isAlreadyExists(error: { message?: string; name?: string }): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  return (
    msg.includes("already exists") ||
    msg.includes("duplicate") ||
    msg.includes("resource already exists")
  );
}

function isDuplicateRow(error: { code?: string; message?: string }): boolean {
  if (error?.code === "23505") return true;
  const msg = (error?.message ?? "").toLowerCase();
  return msg.includes("duplicate key");
}

function extFor(type: string) {
  const sub = (type || "").split("/")[1];
  if (!sub) return "jpg";
  return sub.replace("jpeg", "jpg").split("+")[0].toLowerCase();
}
