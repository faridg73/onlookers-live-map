// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, MapPin, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { deleteMyAccount } from "@/lib/account.functions";
import { updateMyProfile, uploadAvatarFile, type MyProfile } from "@/lib/profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProfileEditorProps = {
  profile: MyProfile | null;
  fallbackName: string;
  onSaved: (profile: MyProfile) => void;
};

export function ProfileEditor({ profile, fallbackName, onSaved }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? fallbackName);
    setFullName(profile?.full_name ?? fallbackName);
    setLocation(profile?.location ?? "");
    setBio(profile?.bio ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [fallbackName, profile]);

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      setAvatarUrl(await uploadAvatarFile(file));
      toast.success("Profile photo uploaded. Save your changes to apply it.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that photo.");
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const next = await updateMyProfile({ displayName, fullName, location, bio, avatarUrl });
      onSaved(next);
      setEditing(false);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your profile.");
    } finally {
      setBusy(false);
    }
  }

  const initials = (displayName || fallbackName || "ON").slice(0, 2).toUpperCase();

  return (
    <>
      <div className="relative size-16 shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="size-16 rounded-2xl object-cover" />
        ) : (
          <div className="grid size-16 place-items-center rounded-2xl bg-signal font-display text-2xl text-signal-foreground">{initials}</div>
        )}
        <button type="button" onClick={() => setEditing(true)} aria-label="Edit profile photo" className="absolute -bottom-3 -right-3 grid size-8 place-items-center rounded-full border-2 border-background bg-secondary text-foreground shadow-lg after:absolute after:-inset-1.5 after:content-['']">
          <Camera className="size-4" />
        </button>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update the details people see across Onlooker.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              {avatarUrl ? <img src={avatarUrl} alt="Profile preview" className="size-20 rounded-2xl object-cover" /> : <div className="grid size-20 place-items-center rounded-2xl bg-signal font-display text-2xl text-signal-foreground">{initials}</div>}
              <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <Camera />} Change photo
              </Button>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
            </div>
            <label className="grid gap-1.5 text-sm font-medium text-foreground"><span className="flex items-center gap-2"><UserRound className="size-4 text-signal" />Display name</span><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required /></label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">Full name<Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} required autoComplete="name" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground"><span className="flex items-center gap-2"><MapPin className="size-4 text-signal" />Location</span><Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="City or region" /></label>
            <label className="grid gap-1.5 text-sm font-medium text-foreground">Bio<Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={4} placeholder="Tell the community about yourself" /><span className="text-right text-xs text-muted-foreground">{bio.length}/280</span></label>
            <Button type="submit" className="h-11 w-full" disabled={busy || uploading}>{busy ? <Loader2 className="animate-spin" /> : null}Save profile</Button>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}

export function AccountDeletion({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const removeAccount = useServerFn(deleteMyAccount);

  async function confirmDeletion() {
    if (confirmation !== "DELETE") return;
    setBusy(true);
    try {
      await removeAccount({ data: { confirmation } });
      await supabase.auth.signOut({ scope: "local" });
      onDeleted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your account.");
      setBusy(false);
    }
  }

  return (
    <section>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-destructive"><Trash2 className="size-3.5" />Delete account</button>
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmation(""); }}>
        <DialogContent className="max-w-md border-destructive/50">
          <DialogHeader><DialogTitle className="text-destructive">Permanently delete account?</DialogTitle><DialogDescription>This cannot be undone. Your profile, posts, bounties, uploads, wallet history, and account access will be permanently removed.</DialogDescription></DialogHeader>
          <label className="grid gap-2 text-sm font-medium text-foreground">Type DELETE to confirm<Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder="DELETE" autoCapitalize="characters" autoComplete="off" /></label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDeletion()} disabled={confirmation !== "DELETE" || busy}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}Delete permanently</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}