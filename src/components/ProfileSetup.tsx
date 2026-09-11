import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { completeMyProfile, fetchMyProfile } from "@/lib/profile";

/**
 * First sign-in gate: asks every new account (email, Google or Apple) to
 * complete their profile details before they can use the app.
 */
export function ProfileSetup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setOpen(false);
      return;
    }
    fetchMyProfile()
      .then((profile) => {
        if (!alive || !profile) return;
        if (profile.onboarded) return;
        setDisplayName(profile.display_name === "onlooker" ? "" : profile.display_name);
        setFullName(profile.full_name === "onlooker" ? "" : profile.full_name);
        setAvatarUrl(profile.avatar_url ?? "");
        setOpen(true);
      })
      .catch(() => {
        /* profile unavailable — do not block the app */
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!open) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (displayName.trim().length < 2 || fullName.trim().length < 2) {
      toast.error("Add your name and a display name to continue.");
      return;
    }
    setBusy(true);
    try {
      await completeMyProfile({
        display_name: displayName,
        full_name: fullName,
        avatar_url: avatarUrl.trim() || null,
      });
      toast.success("Profile saved.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 px-4 pb-6 pt-16 sm:items-center">
      <form
        onSubmit={save}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-5"
      >
        <h2 className="font-display text-2xl tracking-tight text-foreground">
          Finish your profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Requesters and onlookers see this when you post or fulfil a bounty.
        </p>

        <div className="mt-5 space-y-3">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Photo link (optional)"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
