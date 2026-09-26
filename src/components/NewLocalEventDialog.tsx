// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useRef, useState } from "react";
import { CalendarDays, Camera, CheckCircle2, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { AddressSearchField } from "@/components/AddressSearchField";
import { Button } from "@/components/ui/button";
import type { PickedLocation } from "@/components/LocationPreviewMap";
import { createCommunityPost, uploadCommunityPhoto } from "@/lib/community";

/**
 * Posting a real local event: a name, one photo you took yourself, the exact
 * place on the map, and when it starts. Everything else is optional, so the
 * listing lands on Discover, the vibe feeds and the map in a few taps.
 */
export function NewLocalEventDialog({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [spot, setSpot] = useState<PickedLocation | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const reset = () => {
    setTitle("");
    setDetails("");
    setSpot(null);
    setDate("");
    setTime("");
    setPhotoPath(null);
    setPhotoPreview(null);
  };

  const pickPhoto = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadCommunityPhoto(file);
      setPhotoPath(path);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success("Photo added.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add that photo.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (title.trim().length < 4) {
      toast.error("Give the event a name people will recognise.");
      return;
    }
    if (!photoPath) {
      toast.error("Add one real photo of the place or the event.");
      return;
    }
    if (!spot) {
      toast.error("Search for the exact place so it lands on the map.");
      return;
    }
    if (!date || !time) {
      toast.error("Pick the day and the start time.");
      return;
    }
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) {
      toast.error("That date and time didn't look right.");
      return;
    }

    setBusy(true);
    try {
      await createCommunityPost({
        category: "meetups",
        title,
        body: details,
        place: spot.formatted,
        tags: ["event"],
        mediaPath: photoPath,
        isFlash: false,
        latitude: spot.latitude,
        longitude: spot.longitude,
        eventStartsAt: startsAt.toISOString(),
      });
      toast.success("Your event is listed on Discover and the map.");
      reset();
      onPosted();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't list that event.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-6">
      <div className="max-h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-border bg-surface px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:max-h-[92dvh] sm:rounded-3xl sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">
            List a <span className="text-signal">local event</span>
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm"
          >
            <X className="size-5 text-muted-foreground" />
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold text-signal">
          Real events only, with your own photo and the exact spot on the map.
        </p>

        <label className="mt-5 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Event name
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Riverside night market"
            className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-signal"
          />
        </label>

        <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Photo
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pickPhoto(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-signal/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-signal disabled:opacity-60"
        >
          {photoPath ? <CheckCircle2 className="size-4" /> : <Camera className="size-4" />}
          {uploading ? "Adding photo…" : photoPath ? "Photo added, replace it" : "Take or choose a photo"}
        </button>
        {photoPreview && (
          <img
            src={photoPreview}
            alt="Photo you added for this event"
            className="mt-2 aspect-video w-full rounded-xl border border-border object-cover"
          />
        )}

        <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <MapPin className="size-4 text-signal" /> Where
        </p>
        <div className="mt-2">
          <AddressSearchField
            onPick={(location) => setSpot(location)}
            placeholder="Search the venue, address or landmark"
          />
        </div>
        {spot && (
          <p className="mt-2 rounded-xl border border-signal/50 bg-signal/10 px-3 py-2 text-xs font-semibold text-signal">
            {spot.formatted}
          </p>
        )}

        <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <CalendarDays className="size-4 text-signal" /> When it starts
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-signal"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium text-foreground outline-none focus:border-signal"
          />
        </div>

        <label className="mt-4 block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Details (optional)
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Who it's for, what's on, entry or parking notes."
            className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-signal"
          />
        </label>

        <Button
          type="button"
          disabled={busy || uploading}
          onClick={() => void submit()}
          className="mt-5 h-12 w-full rounded-xl text-sm font-extrabold uppercase tracking-[0.12em]"
        >
          {busy ? "Listing…" : "List this event"}
        </Button>
      </div>
    </div>
  );
}
