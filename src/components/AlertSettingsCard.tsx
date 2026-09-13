import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendTestAlertText } from "@/lib/sms.functions";
import { toast } from "sonner";
import { Bell, Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_ALERT_PREFERENCES,
  RADIUS_CHOICES,
  fetchAlertPreferences,
  saveAlertPreferences,
  type AlertPreferences,
} from "@/lib/alerts";

/**
 * Bounty Radar settings: how far away someone wants to hear about new bounties
 * and which channels those alerts should arrive on.
 */
export function AlertSettingsCard() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<AlertPreferences>(DEFAULT_ALERT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [smsState, setSmsState] = useState<{ ok: boolean; message: string } | null>(null);
  const sendTestText = useServerFn(sendTestAlertText);

  const sendTest = async () => {
    setTesting(true);
    setSmsState(null);
    try {
      await saveAlertPreferences(prefs);
      const result = await sendTestText({ data: { phone: prefs.phone } });
      setSmsState(
        result.ok
          ? { ok: true, message: "Test text sent — check your phone." }
          : { ok: false, message: result.error ?? "Could not send that text." },
      );
    } catch (error) {
      setSmsState({
        ok: false,
        message: error instanceof Error ? error.message : "Could not send that text.",
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void fetchAlertPreferences().then(setPrefs);
  }, [user]);

  if (!user) return null;

  const set = <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await saveAlertPreferences(prefs);
      toast.success("Bounty Radar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your alert settings");
    } finally {
      setSaving(false);
    }
  };

  const rows: { key: "push_enabled" | "sms_enabled" | "email_enabled"; label: string; hint: string; icon: typeof Bell }[] =
    [
      { key: "push_enabled", label: "In-app alerts", icon: Bell, hint: "Pops up the moment a bounty lands nearby" },
      { key: "sms_enabled", label: "Text message", icon: MessageSquare, hint: "Texts your phone with the place, payout and claim link" },
      { key: "email_enabled", label: "Email", icon: Mail, hint: "Starts once your sending address is verified" },
    ];

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-display text-lg text-foreground">Bounty Radar alerts</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Choose how far away you want to hear about new bounties, and how we reach you.
      </p>

      <div className="mt-4 space-y-2">
        {rows.map(({ key, label, hint, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-3 py-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="size-4 text-signal" /> {label}
              </p>
              <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{hint}</p>
            </div>
            <Switch checked={prefs[key]} onCheckedChange={(v) => set(key, v)} aria-label={label} />
          </div>
        ))}
      </div>

      {prefs.sms_enabled && (
        <div className="mt-3 space-y-2">
          <Input
            type="tel"
            inputMode="tel"
            placeholder="Mobile number for texts, e.g. (213) 555-0134"
            value={prefs.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-xl font-bold"
            disabled={testing || prefs.phone.trim().length < 5}
            onClick={() => void sendTest()}
          >
            {testing ? "Texting you…" : "Send a test text"}
          </Button>
          {smsState && (
            <p
              className={`text-[0.7rem] ${
                smsState.ok ? "text-signal" : "text-destructive"
              }`}
            >
              {smsState.message}
            </p>
          )}
        </div>
      )}

      <p className="mt-5 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
        Alert radius
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {RADIUS_CHOICES.map((miles) => (
          <button
            key={miles}
            type="button"
            aria-pressed={prefs.radius_miles === miles}
            onClick={() => set("radius_miles", miles)}
            className={`rounded-xl border px-2 py-2 text-sm font-bold ${
              prefs.radius_miles === miles
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface-raised text-foreground"
            }`}
          >
            {miles} mi
          </button>
        ))}
      </div>
      <Input
        className="mt-2"
        type="number"
        min={1}
        max={100}
        step={1}
        placeholder="Custom radius in miles"
        value={prefs.radius_miles}
        onChange={(e) => set("radius_miles", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
      />
      <div className="mt-2 flex items-center gap-2">
        <MapPin className="size-4 shrink-0 text-signal" />
        <Input
          placeholder="Neighbourhood or zip code (optional)"
          value={prefs.area_label}
          onChange={(e) => set("area_label", e.target.value)}
        />
      </div>

      <Button type="button" className="mt-4 h-11 w-full rounded-xl font-bold" disabled={saving} onClick={() => void save()}>
        {saving ? "Saving…" : "Save alert settings"}
      </Button>
    </section>
  );
}
