import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Car,
  Flame,
  HeartPulse,
  Loader2,
  Lock,
  MapPin,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createCommunityPost, uploadCommunityPhoto } from "@/lib/community";
import { awardReputation } from "@/lib/reputation";
import {
  EMERGENCY_LOCKED_NOTE,
  INCIDENT_TYPES,
  fetchMyTrustLevel,
  incidentById,
  type IncidentType,
  type TrustLevel,
} from "@/lib/trust-tiers";

const ICONS: Record<IncidentType["id"], typeof Flame> = {
  fire: Flame,
  police: Shield,
  medical: HeartPulse,
  traffic: Car,
  hazard: AlertTriangle,
  general: Users,
};

const LEGAL_LINE =
  "I understand that intentional false reports or pranks result in immediate account suspension and a permanent platform ban.";

/**
 * The Create Community Report form: incident type, verified-only replies,
 * media, live geo-radius and witness details, gated by the false-report pledge.
 */
export function CreateCommunityReportModal({
  open,
  onOpenChange,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
}) {
  const [level, setLevel] = useState<TrustLevel>(1);
  const [incident, setIncident] = useState<IncidentType["id"] | "">("");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [details, setDetails] = useState("");
  const [radius, setRadius] = useState(500);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    void fetchMyTrustLevel().then(setLevel);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 8000 },
      );
    }
  }, [open]);

  if (!open) return null;

  const picked = incident ? incidentById(incident) : undefined;
  const locked = Boolean(picked?.emergency) && level < 3;
  const ready = Boolean(picked) && !locked && details.trim().length >= 8 && accepted && !uploading;

  const handleFile = (file: File) => {
    setUploading(true);
    void uploadCommunityPhoto(file)
      .then((path) => setMediaPath(path))
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Couldn't attach that media."),
      )
      .finally(() => setUploading(false));
  };

  const submit = async () => {
    if (!picked || !ready) return;
    setBusy(true);
    try {
      await createCommunityPost({
        category: picked.category,
        title: `${picked.label} report`,
        body: `${details.trim()}\n\nActive geo-radius: ${radius}m.${
          verifiedOnly ? "\nVerified creator replies only." : ""
        }\nFalse-report pledge accepted.`,
        place: coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : "",
        tags: [
          picked.tag,
          `radius:${radius}m`,
          ...(verifiedOnly ? ["verified-only"] : []),
        ],
        mediaPath,
        isFlash: false,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      });
      void awardReputation("validate_marker", `report:${picked.id}:${Date.now()}`);
      toast.success("Report filed. Thanks for keeping the area informed.");
      setIncident("");
      setDetails("");
      setMediaPath(null);
      setAccepted(false);
      onPosted?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't file that report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 sm:items-center sm:p-6">
      <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl border border-signal/30 bg-surface p-4 shadow-[0_0_40px_rgba(0,0,0,0.6)] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-2">
          <button type="button" aria-label="Back" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="size-5 text-signal" />
          </button>
          <h2 className="text-center text-base font-extrabold uppercase tracking-[0.1em] text-signal">
            Create Community Report
          </h2>
          <button type="button" aria-label="Close report form" onClick={() => onOpenChange(false)}>
            <X className="size-5 text-signal" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* 1. Incident type */}
          <section className="rounded-2xl border border-signal/30 bg-surface-raised p-3">
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              1. Incident type
            </p>
            <select
              value={incident}
              onChange={(e) => setIncident(e.target.value as IncidentType["id"] | "")}
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-signal"
            >
              <option value="">Select Incident…</option>
              {INCIDENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                  {type.emergency && level < 3 ? " (verify to unlock)" : ""}
                </option>
              ))}
            </select>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {INCIDENT_TYPES.map((type) => {
                const Icon = ICONS[type.id];
                const isLocked = type.emergency && level < 3;
                const on = incident === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={on}
                    disabled={isLocked}
                    onClick={() => setIncident(type.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[0.68rem] font-bold ${
                      on ? "border-crisis bg-crisis/15 text-crisis" : "border-border text-muted-foreground"
                    } ${isLocked ? "opacity-50" : ""}`}
                  >
                    {isLocked ? (
                      <Lock className="size-5" />
                    ) : (
                      <Icon className={`size-5 ${on ? "text-crisis" : "text-crisis/70"}`} />
                    )}
                    {type.label}
                  </button>
                );
              })}
            </div>
            {level < 3 && (
              <p className="mt-2 text-[0.68rem] text-muted-foreground">{EMERGENCY_LOCKED_NOTE}</p>
            )}
          </section>

          {/* 2. Creator authentication */}
          <section className="rounded-2xl border border-signal/30 bg-surface-raised p-3">
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              2. Creator authentication
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={verifiedOnly}
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className="mt-2 flex w-full items-center gap-3 text-left"
            >
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  verifiedOnly ? "bg-signal" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-background transition-all ${
                    verifiedOnly ? "left-[1.4rem]" : "left-0.5"
                  }`}
                />
              </span>
              <span className="text-xs font-semibold text-foreground">
                Require Verified Creator Badge Only
              </span>
            </button>
          </section>

          {/* 3. Media upload */}
          <section className="rounded-2xl border border-signal/30 bg-surface-raised p-3">
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              3. Photo upload
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-signal/60 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-foreground"
            >
              <Camera className="size-4 text-signal" /> Add Photo / Video
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {(uploading || mediaPath) && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 text-[0.7rem] text-muted-foreground">
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-signal" /> Analysing media…
                  </>
                ) : (
                  <>
                    <Camera className="size-4 text-signal" /> Media attached
                  </>
                )}
              </div>
            )}
          </section>

          {/* 4. Geo radius */}
          <section className="rounded-2xl border border-signal/30 bg-surface-raised p-3">
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              4. Geo-radius status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <MapPin className={`size-5 ${coords ? "text-signal" : "text-muted-foreground"}`} />
              <p className="text-xs font-semibold text-foreground">
                Active Geo-Radius: {radius}m
              </p>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={radius}
              aria-label="Active geo-radius in metres"
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-signal"
            />
            <p className="mt-1 text-[0.68rem] text-muted-foreground">
              {coords ? "Locked to your current position." : "Waiting for your location…"}
            </p>
          </section>

          {/* 5. Details */}
          <section className="rounded-2xl border border-signal/30 bg-surface-raised p-3 sm:col-span-2">
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
              5. Details / witnesses
            </p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Enter details or witness accounts…"
              className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-signal"
            />
          </section>
        </div>

        {/* Legal gate */}
        <section className="mt-3 rounded-2xl border border-crisis/70 bg-crisis/10 p-3">
          <p className="flex items-center justify-between text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-crisis">
            Legal warning &amp; agreement
            <AlertTriangle className="size-4" />
          </p>
          <label className="mt-2 flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-crisis"
            />
            <span>{LEGAL_LINE}</span>
          </label>
          <p className="mt-2 text-center text-[0.72rem] font-extrabold uppercase leading-snug text-crisis">
            Warning: this report is community-driven.
            <br />
            Do not put yourself in danger.
            <br />
            For life-threatening emergencies, call 911.
          </p>
        </section>

        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void submit()}
          className="mt-3 w-full rounded-xl border-2 border-crisis bg-crisis/15 px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] text-crisis shadow-[0_0_18px_rgba(255,92,92,0.45)] disabled:border-border disabled:bg-surface-raised disabled:text-muted-foreground disabled:shadow-none"
        >
          {busy ? "Submitting…" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}
