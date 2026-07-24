"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Staged = {
  id: string;
  file: File;
  url: string;
};

const BUCKET = "knowledge-photos";

export default function CaptureForm() {
  const router = useRouter();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Staged[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

  async function save() {
    setError(null);

    if (photos.length === 0 && note.trim() === "") {
      setError("Add at least one photo or a note before saving.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setError("Your session expired. Please sign in again.");
      setSaving(false);
      router.replace("/login");
      return;
    }

    const captureId = crypto.randomUUID();
    const uploadedPaths: string[] = [];

    try {
      for (let i = 0; i < photos.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${photos.length}…`);
        const p = photos[i];
        const ext = extFor(p.file);
        const path = `${user.id}/${captureId}/${String(i).padStart(
          2,
          "0",
        )}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, p.file, {
            contentType: p.file.type || "image/jpeg",
            upsert: false,
          });

        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        uploadedPaths.push(path);
      }

      setProgress("Saving…");
      const { error: insErr } = await supabase.from("captures").insert({
        id: captureId,
        note: note.trim() || null,
        photo_paths: uploadedPaths,
        created_by: user.id,
        created_by_email: user.email ?? null,
      });

      if (insErr) throw new Error(`Save failed: ${insErr.message}`);

      reset();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
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
        </div>
        <h2 className="mt-4 text-xl font-semibold text-white">Saved</h2>
        <p className="mt-1 text-sm text-slate-400">
          Your knowledge is stored and won&apos;t be lost.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            onClick={() => setDone(false)}
            className="rounded-xl bg-amber-500 px-4 py-3.5 text-base font-semibold text-slate-950 transition active:scale-[0.99]"
          >
            Capture another
          </button>
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-700 px-4 py-3.5 text-base font-medium text-slate-200 transition active:scale-[0.99]"
          >
            Back to home
          </button>
        </div>
      </div>
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

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInput.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 py-6 transition active:scale-[0.98]"
        >
          <span className="text-amber-500">
            <CameraIcon />
          </span>
          <span className="text-sm font-medium text-slate-200">Take photo</span>
        </button>
        <button
          onClick={() => libraryInput.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 py-6 transition active:scale-[0.98]"
        >
          <span className="text-amber-500">
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
          className="resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-amber-500"
        />
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
          className="w-full rounded-xl bg-amber-500 px-4 py-4 text-base font-semibold text-slate-950 transition active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? progress ?? "Saving…" : "Save knowledge"}
        </button>
      </div>
    </div>
  );
}

function extFor(file: File) {
  const fromType = file.type.split("/")[1];
  if (fromType) return fromType.replace("jpeg", "jpg");
  const fromName = file.name.split(".").pop();
  return (fromName || "jpg").toLowerCase();
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
