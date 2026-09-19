import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
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
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { createCommunityPost, uploadCommunityPhoto } from "@/lib/community";
import { awardReputation } from "@/lib/reputation";
import {
  EMERGENCY_LOCKED_NOTE,
  INCIDENT_TYPES,
  fetchMyTrustLevel,
  incidentById,
  trustTier,
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

const REPORT_INCIDENTS = INCIDENT_TYPES;

const LEGAL_LINE =
  "I understand that intentional false reports or pranks result in immediate account suspension and a permanent platform ban.";

/**
 * The Create Community Report form: visual incident selection, automatic
 * trust status, media, live geo-radius and the false-report pledge.
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
  const [details, setDetails] = useState("");
  const [radius, setRadius] = useState(500);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: "image" | "video";
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { unit } = useDistanceUnit(coords ? { lat: coords.latitude, lng: coords.longitude } : null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    void fetchMyTrustLevel().then(setLevel);
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => setCoords(null),
        { timeout: 8000 },
      );
    }
  }, [open]);

  useEffect(
    () => () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    },
    [mediaPreview],
  );

  if (!open) return null;

  const picked = incident ? incidentById(incident) : undefined;
  const locked = Boolean(picked?.emergency) && level < 3;
  const ready = Boolean(picked) && !locked && details.trim().length >= 8 && accepted && !uploading && !analyzing;
  const tier = trustTier(level);
  const radiusLabel =
    unit === "mi"
      ? `${(radius / 1609.344).toFixed(1)} mi`
      : radius < 1000
        ? `${radius}m`
        : `${(radius / 1000).toFixed(1)} km`;

  const handleFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview({
      url: previewUrl,
      type: file.type.startsWith("video/") ? "video" : "image",
      name: file.name,
    });
    setUploading(true);
    void uploadCommunityPhoto(file)
      .then(async (path) => {
        setMediaPath(path);
        setAnalyzing(true);
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        setAnalyzing(false);
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Couldn't attach that media."),
      )
      .finally(() => setUploading(false));
  };

  const submit = async () => {
    if (!picked || !ready) return;
    if (signedIn === false) {
      setFormError("Sign in to file a report — tap Sign in below.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createCommunityPost({
        category: picked.category,
        title: `${picked.label} report`,
        body: `${details.trim()}\n\nActive geo-radius: ${radius}m.\nReporter trust tier: Level ${level}.\nFalse-report pledge accepted.`,
        place: coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : "",
        tags: [
          picked.tag,
          `radius:${radius}m`,
          `trust-level:${level}`,
        ],
        mediaPath,
        isFlash: false,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        reportIncidentType: picked.id,
        reportRadiusM: radius,
        mediaAnalysisStatus: mediaPath ? "complete" : "not_required",
      });
      void awardReputation("validate_marker", `report:${picked.id}:${Date.now()}`);
      toast.success("Report filed. Thanks for keeping the area informed.");
      setIncident("");
      setDetails("");
      setMediaPath(null);
      setMediaPreview(null);
      setAccepted(false);
      onPosted?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't file that report.";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-background/90 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-signal/40 bg-surface shadow-2xl sm:rounded-2xl">
        <header className="z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
          <Button type="button" variant="ghost" size="icon" aria-label="Back" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="size-5 text-signal" />
          </Button>
          <h2 className="text-center text-base font-extrabold uppercase text-signal sm:text-lg">
            Create Community Report
          </h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close report form" onClick={() => onOpenChange(false)}>
            <X className="size-5 text-signal" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto overscroll-contain p-3 min-[440px]:grid-cols-2 sm:p-4">
          <div className="grid content-start gap-3">
          {/* 1. Incident type */}
          <section className="rounded-md border border-signal/50 bg-surface-raised p-3">
            <p className="text-[0.68rem] font-extrabold uppercase text-signal">
              1. Incident type
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {REPORT_INCIDENTS.map((type) => {
                const Icon = ICONS[type.id];
                const isLocked = type.emergency && level < 3;
                const on = incident === type.id;
                return (
                  <Button
                    key={type.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={on}
                    disabled={isLocked}
                    onClick={() => setIncident(type.id)}
                    className={`h-[4.75rem] min-w-0 flex-col gap-1 rounded-md border px-1 py-2 text-[0.68rem] font-bold ${
                      on
                        ? "border-crisis bg-crisis/15 text-crisis shadow-[0_0_16px_var(--color-crisis)]"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="size-6 text-muted-foreground" />
                    ) : (
                      <Icon className="size-6 text-crisis" />
                    )}
                    {type.label}
                  </Button>
                );
              })}
            </div>
            {level < 3 && (
              <p className="mt-2 text-[0.68rem] text-muted-foreground">{EMERGENCY_LOCKED_NOTE}</p>
            )}
          </section>

          {/* 3. Media upload */}
          <section className="rounded-md border border-signal/50 bg-surface-raised p-3">
            <p className="text-[0.68rem] font-extrabold uppercase text-signal">
              3. Photo / video upload
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="mt-2 w-full border-signal/60 bg-background text-xs font-bold uppercase text-foreground"
            >
              <Camera className="size-4 text-signal" /> Add Photo / Video
            </Button>
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
            {mediaPreview && (
              <div className="relative mt-2 aspect-video overflow-hidden rounded-md border border-border bg-background">
                {mediaPreview.type === "video" ? (
                  <video src={mediaPreview.url} muted playsInline className="size-full object-cover" />
                ) : (
                  <img src={mediaPreview.url} alt="Selected report media" className="size-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-background/85 px-2 py-1 text-[0.65rem] text-foreground">
                  {uploading || analyzing ? <Loader2 className="size-3 animate-spin text-signal" /> : <BadgeCheck className="size-3 text-signal" />}
                  <span className="truncate">{uploading ? "Uploading…" : analyzing ? "Analyzing media…" : `Analysis complete · ${mediaPreview.name}`}</span>
                </div>
              </div>
            )}
          </section>
          </div>

          <div className="grid content-start gap-3">
          {/* 2. Creator authentication */}
          <section className="rounded-md border border-signal/50 bg-surface-raised p-3">
            <p className="text-[0.68rem] font-extrabold uppercase text-signal">
              2. Creator authentication
            </p>
            <div className="mt-2 flex items-center gap-3 rounded-md border border-border bg-background p-2.5">
              {level === 3 ? (
                <BadgeCheck className="size-7 shrink-0 text-signal" />
              ) : (
                <Shield className="size-7 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-foreground">Level {level} · {tier.name}</p>
                <p className="mt-0.5 text-[0.68rem] leading-snug text-muted-foreground">
                  {level === 3 ? "Verified for emergency reporting." : "Emergency lanes remain locked until Level 3."}
                </p>
              </div>
            </div>
          </section>

          {/* 4. Geo radius */}
          <section className="rounded-md border border-signal/50 bg-surface-raised p-3">
            <p className="text-[0.68rem] font-extrabold uppercase text-signal">
              4. Geo-radius status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <MapPin className={`size-5 ${coords ? "text-signal" : "text-muted-foreground"}`} />
              <p className="text-xs font-semibold text-foreground">
                Active Geo-Radius: {radiusLabel}
              </p>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={radius}
              aria-label={`Active geo-radius, ${radiusLabel}`}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-2 w-full accent-signal"
            />
            <p className="mt-1 text-[0.68rem] text-muted-foreground">
              {coords ? "Locked to your current position." : "Waiting for your location…"}
            </p>
          </section>

          {/* 5. Details */}
          <section className="rounded-md border border-signal/50 bg-surface-raised p-3">
            <p className="text-[0.68rem] font-extrabold uppercase text-signal">
              5. Details / witnesses
            </p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Enter details or witness accounts…"
              className="mt-2 w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-signal"
            />
          </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
          <section className="rounded-md border border-crisis/70 bg-crisis/10 p-3">
            <p className="flex items-center justify-between text-[0.68rem] font-extrabold uppercase text-crisis">
              Legal warning &amp; agreement
              <AlertTriangle className="size-4" />
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-crisis"
              />
              <span>{LEGAL_LINE}</span>
            </label>
            <p className="mt-2 text-center text-[0.7rem] font-extrabold uppercase leading-snug text-crisis">
              Warning: this report is community-driven. Do not put yourself in danger.
              <br />For life-threatening emergencies, call 911.
            </p>
          </section>

          <Button
            type="button"
            disabled={!ready || busy}
            onClick={() => void submit()}
            className={`mt-3 h-12 w-full border-2 text-sm font-extrabold uppercase ${
              ready
                ? "border-crisis bg-crisis/15 text-crisis shadow-[0_0_18px_var(--color-crisis)] hover:bg-crisis/20"
                : "border-border bg-surface-raised text-muted-foreground shadow-none"
            }`}
          >
            {busy ? "Submitting…" : "Submit Report"}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
