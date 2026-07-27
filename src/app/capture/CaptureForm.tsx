"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { enqueue } from "@/lib/offline/db";
import { prepareImage } from "@/lib/offline/image";
import { useOffline } from "@/components/OfflineProvider";

type Staged = {
  id: string;
  file: File;
  url: string;
};

type SavedState = "uploaded" | "queued";

export default function CaptureForm({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string | null;
}) {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const { online, syncNow } = useOffline();

  const [photos, setPhotos] = useState<Staged[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SavedState | null>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: Staged[] = [];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith("image/")) continue;
      next.push({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        url: URL.createObjectURL(file),
      });
    }
    setPhotos((prev) => [...prev, ...next]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setNote("");
    setError(null);
    setProgress(null);
  }

  /**
   * Save = write to the phone first, always. Uploading is a second, optional
   * step. That order is the whole point: signal can vanish between tapping
   * Save and the first byte leaving the phone, and the capture still survives.
   */
  async function save() {
    setError(null);

    if (photos.length === 0 && note.trim() === "") {
      setError("Add at least one photo or a note before saving.");
      return;
    }

    setSaving(true);

    try {
      const prepared: { blob: Blob; type: string }[] = [];
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Preparing photo ${i + 1} of ${photos.length}…`);
        prepared.push(await prepareImage(photos[i].file));
      }

      setProgress("Saving to this phone…");
      await enqueue({
        id: crypto.randomUUID(),
        note,
        photos: prepared,
        createdAt: Date.now(),
        userId,
        userEmail,
      });

      // Safely on the device now. Try to push it up right away; if that fails
      // or we're offline, the sync engine picks it up later on its own.
      let wentUp = false;
      if (online) {
        setProgress("Uploading…");
        await syncNow();
        wentUp = navigator.onLine;
      }

      reset();
      setDone(wentUp ? "uploaded" : "queued");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't save to this phone. Try again.",
      );
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  if (done) {
    return (
      <SavedScreen
        state={done}
        onAgain={() => setDone(null)}
        onHome={() => router.push("/")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-6">
      {/* Hidden native inputs */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {!online && (
        <p className="mt-4 rounded-xl border border-burnt-500/40 bg-burnt-500/10 px-3.5 py-3 text-sm leading-relaxed text-burnt-400">
          <span className="font-semibold">No service right now.</span> Keep
          shooting — everything saves to this phone and uploads by itself when
          you get back in range.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInput.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 py-6 transition active:scale-[0.98]"
        >
          <span className="text-burnt-500">
            <CameraIcon />
          </span>
          <span className="text-sm font-medium text-slate-200">Take photo</span>
        </button>
        <button
          onClick={() => libraryInput.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 py-6 transition active:scale-[0.98]"
        >
          <span className="text-burnt-500">
            <LibraryIcon />
          </span>
          <span className="text-sm font-medium text-slate-200">
            Add from library
          </span>
        </button>
      </div>

      {photos.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Remove photo"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Notes
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={6}
          placeholder="Unit details, serial numbers, site name, what this is, who to call — anything worth keeping."
          className="resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-burnt-500"
        />
        {/* Dictation is the phone keyboard's own, not ours: iOS and Android both
            put a mic key on the keyboard for any textarea, and nothing here
            blocks it. That beats a custom speech-API button in the field --
            it handles long rambling notes and punctuation commands, and needs
            no extra mic permission. It also keeps working with no signal,
            since dictation runs on-device. This hint just makes sure the guys
            know it's there. */}
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          <MicIcon />
          Talk instead of typing — tap the microphone on your keyboard.
        </span>
      </label>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="safe-b mt-auto pt-6">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-burnt-500 px-4 py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? (progress ?? "Saving…") : "Save knowledge"}
        </button>
      </div>
    </div>
  );
}

function SavedScreen({
  state,
  onAgain,
  onHome,
}: {
  state: SavedState;
  onAgain: () => void;
  onHome: () => void;
}) {
  const queued = state === "queued";

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          queued
            ? "bg-burnt-500/15 text-burnt-400"
            : "bg-emerald-500/15 text-emerald-400"
        }`}
      >
        {queued ? <PhoneIcon /> : <CheckIcon />}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">
        {queued ? "Saved to this phone" : "Saved"}
      </h2>
      <p className="mt-1 max-w-xs text-sm leading-relaxed text-slate-400">
        {queued
          ? "It'll upload by itself as soon as you're back in service. You can close the app — it won't be lost."
          : "Your knowledge is stored and won't be lost."}
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          onClick={onAgain}
          className="rounded-xl bg-burnt-500 px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.99]"
        >
          Capture another
        </button>
        <button
          onClick={onHome}
          className="rounded-xl border border-slate-700 px-4 py-3.5 text-base font-medium text-slate-200 transition active:scale-[0.99]"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="2" width="14" height="20" rx="2.5" />
      <path d="M11 18.5h2" />
      <path d="M9.5 9 12 11.5 14.5 9" />
      <path d="M12 5.5v6" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}
