import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useHumanCheck } from "@/components/HumanCheck";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import {
  SECURITY_QUESTIONS,
  completeMyProfile,
  fetchMyProfile,
  isUsernameAvailable,
  uploadAvatarFile,
  usernameProblem,
  type SecurityAnswers,
} from "@/lib/profile";

type UsernameState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "invalid"; message: string }
  | { kind: "taken" }
  | { kind: "free" };

/**
 * First sign-in gate: asks every new account (email, Google or Apple) to
 * complete their profile details before they can use the app.
 */
export function ProfileSetup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [answers, setAnswers] = useState<SecurityAnswers>({});
  const [nameState, setNameState] = useState<UsernameState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Visible bot challenge in front of the onboarding details.
  const human = useHumanCheck("profile-setup");

  useEffect(() => {
    let alive = true;
    // Always start from a blank form for whichever account is signed in now, so
    // a previous session's details can never bleed into a brand-new account.
    setOpen(false);
    setUsername("");
    setFirstName("");
    setLastName("");
    setAvatarUrl("");
    setAnswers({});
    setNameState({ kind: "idle" });
    if (!user) return;
    const signedInId = user.id;
    fetchMyProfile(signedInId)
      .then((profile) => {
        if (!alive || !profile) return;
        // Guard against a stale fetch that resolved for a different account.
        if (profile.id !== signedInId) return;
        if (profile.onboarded) return;
        setUsername(profile.username ?? "");
        setFirstName(profile.legal_first_name ?? "");
        setLastName(profile.legal_last_name ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
        setOpen(true);
      })
      .catch(() => {
        /* profile unavailable — do not block the app */
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Live availability check while typing, debounced so we don't hammer the DB.
  useEffect(() => {
    const clean = username.trim();
    if (!clean) {
      setNameState({ kind: "idle" });
      return;
    }
    const problem = usernameProblem(clean);
    if (problem) {
      setNameState({ kind: "invalid", message: problem });
      return;
    }
    setNameState({ kind: "checking" });
    const timer = window.setTimeout(() => {
      isUsernameAvailable(clean)
        .then((free) => setNameState(free ? { kind: "free" } : { kind: "taken" }))
        .catch(() => setNameState({ kind: "idle" }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username]);

  if (!open) return null;

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatarFile(file);
      setAvatarUrl(url);
      toast.success("Photo uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that photo.");
    } finally {
      setUploading(false);
    }
  }

  const answeredCount = SECURITY_QUESTIONS.filter((q) => answers[q.key]).length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error("Add your legal first and last name to continue.");
      return;
    }
    if (nameState.kind === "invalid") {
      toast.error(nameState.message);
      return;
    }
    if (nameState.kind === "taken") {
      toast.error("That username is already claimed, pick another.");
      return;
    }
    if (nameState.kind !== "free") {
      toast.error("Choose an available username to continue.");
      return;
    }
    if (answeredCount < 2) {
      toast.error("Answer at least two recovery questions.");
      return;
    }

    if (!human.ready) {
      toast.error("Complete the human check to continue.");
      return;
    }

    setBusy(true);
    try {
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "profile-setup" },
      });
      if (!check.ok) {
        human.reset();
        throw new Error("The human check didn't pass. Please try again.");
      }

      // Bind strictly to the account that is signed in right now — never a
      // leftover session from an earlier login on this device.
      const { data: fresh, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !fresh.user) {
        throw new Error("Your session expired, please sign in again.");
      }
      if (user && fresh.user.id !== user.id) {
        throw new Error("Your session changed, reload the page and try again.");
      }

      await completeMyProfile({
        expectedUserId: fresh.user.id,
        username: username.trim(),
        legal_first_name: firstName,
        legal_last_name: lastName,
        avatar_url: avatarUrl.trim() || null,
        security_answers: answers,
      });
      toast.success("Profile saved.");
      setOpen(false);
      // Drop anything cached under the previous session, then land on this
      // account's own dashboard.
      await queryClient.cancelQueries();
      queryClient.clear();
      await router.invalidate();
      await navigate({ to: "/profile", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-signal";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/80 px-4 pb-6 pt-16 sm:items-center">
      <form
        onSubmit={save}
        className="my-auto w-full max-w-md rounded-3xl border border-border bg-surface p-5"
      >
        <h2 className="font-display text-2xl tracking-tight text-foreground">
          Finish your profile
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Requesters and onlookers see this when you post or fulfil a bounty.
        </p>

        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Legal first name"
              autoComplete="given-name"
              className={fieldClass}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Legal last name"
              autoComplete="family-name"
              className={fieldClass}
            />
          </div>

          <div>
            <div className="relative">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="Username"
                autoComplete="off"
                autoCapitalize="none"
                className={`${fieldClass} pr-11`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                {nameState.kind === "checking" && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
                {nameState.kind === "free" && <Check className="size-4 text-signal" />}
                {(nameState.kind === "taken" || nameState.kind === "invalid") && (
                  <X className="size-4 text-destructive" />
                )}
              </span>
            </div>
            {nameState.kind === "taken" && (
              <p className="mt-1.5 text-xs text-destructive">
                “{username.trim()}” is already claimed, try another.
              </p>
            )}
            {nameState.kind === "invalid" && (
              <p className="mt-1.5 text-xs text-destructive">{nameState.message}</p>
            )}
            {nameState.kind === "free" && (
              <p className="mt-1.5 text-xs text-signal">“{username.trim()}” is available.</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile photo"
                className="size-12 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="size-12 shrink-0 rounded-xl bg-surface-raised" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">Profile photo</p>
              <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={pickPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-signal/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-signal disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploading ? "Uploading" : avatarUrl ? "Change" : "Upload"}
            </button>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Account recovery</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Answer at least two, we use these to confirm it's you.
        </p>
        <div className="mt-3 space-y-3">
          {SECURITY_QUESTIONS.map((q) => (
            <label key={q.key} className="block">
              <span className="text-xs text-muted-foreground">{q.label}</span>
              <select
                value={answers[q.key] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                className={`mt-1 ${fieldClass}`}
              >
                <option value="">Choose an answer</option>
                {q.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-5">{human.widget}</div>

        {human.required && !human.token && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tick the box so we know you&rsquo;re a real person.
          </p>
        )}

        <button
          type="submit"
          disabled={busy || uploading || !human.ready}
          className="mt-5 w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </div>
  );
}
