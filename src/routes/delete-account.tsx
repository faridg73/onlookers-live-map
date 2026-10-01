// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { submitSupportTicket } from "@/lib/support.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your Onlooker account" },
      { name: "description", content: "Request deletion of your Onlooker account and the data linked to it." },
      { property: "og:title", content: "Delete your Onlooker account" },
      { property: "og:description", content: "How to delete your Onlooker account, what is removed and what we must keep." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await submitSupportTicket({
        data: {
          name,
          email,
          subject: "Account deletion request",
          message: `Please delete the Onlooker account registered to ${email}.\n\n${note || "No extra details."}`,
        },
      });
      if (!res.success) throw new Error(res.error ?? "Could not send your request.");
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl text-foreground">Delete your Onlooker account</h1>
      <div className="mt-4 space-y-3 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Fastest way:</strong> open the app, go to Profile → Account and tap{" "}
          <em>Delete account</em>. It takes effect right away.
        </p>
        <p>
          Can't sign in? Send the request below from the email on your account. We confirm it's you and delete the
          account within 30 days.
        </p>
        <p>
          <strong className="text-foreground">What is deleted:</strong> your profile, photo, posts, bounties, uploaded
          clips, chats, followers and sign-in details.
        </p>
        <p>
          <strong className="text-foreground">What we keep:</strong> payment and payout records required by law
          (usually up to 7 years), and safety reports needed to prevent fraud.
        </p>
        <p>
          <strong className="text-foreground">Credits:</strong> any credit balance or credits held in escrow are lost
          when the account is deleted. Cash out from the Balance page first.
        </p>
      </div>

      {done ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-foreground">
          Request received. We'll email you to confirm it's you before deleting the account.
        </p>
      ) : (
        <form
          className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input required type="email" placeholder="Email on your account" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Textarea placeholder="Anything we should know (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button type="submit" variant="destructive" disabled={busy || !name || !email}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Request account deletion
          </Button>
        </form>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Questions? <Link to="/contact" className="text-signal underline">Contact support</Link>.
      </p>
    </main>
  );
}
