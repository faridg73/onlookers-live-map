// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, Headphones, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { submitSupportTicket } from "@/lib/support.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Onlooker Support" },
      {
        name: "description",
        content:
          "Get help with Onlooker. Send a message to our support team.",
      },
      { property: "og:title", content: "Contact Onlooker Support" },
      {
        property: "og:description",
        content: "Get help with bounties, payouts, disputes, and account questions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactScreen,
});

const SUBJECTS = [
  "General question",
  "Bounty or payout issue",
  "Dispute help",
  "Account & verification",
  "Bug report",
  "Feature request",
  "Safety / legal concern",
  "Other",
];

function ContactScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: user?.user_metadata?.["full_name"] ?? "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill out every field.");
      return;
    }

    setBusy(true);
    try {
      const result = await submitSupportTicket({ data: form });
      if (result.success) {
        setSent(true);
        toast.success("Message sent, we'll get back to you soon.");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        toast.error(result.error ?? "Couldn't send your message. Try again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      window.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(env(safe-area-inset-top),3rem)] sm:px-6 lg:px-8">
      <header className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-signal text-signal-foreground">
          <Headphones className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl tracking-tight text-foreground">
            Contact &amp; <span className="text-signal">Support</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Questions about bounties, payouts, disputes, or your account? Send us a message.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close and go back"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-signal bg-signal/10 text-signal shadow-[0_0_12px_rgba(204,255,0,0.35)] transition hover:bg-signal hover:text-signal-foreground active:scale-95"
        >
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </header>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 font-display text-base text-foreground">
          <MessageSquare className="size-4 text-signal" /> Send a message
        </h2>

        {sent ? (
          <div className="mt-4 rounded-2xl border border-signal/40 bg-surface-raised p-6 text-center">
            <p className="text-sm font-medium text-foreground">Thanks for reaching out.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Our support team will review your message and reply via email.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-signal underline underline-offset-4"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your name"
                  className="field mt-1"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@email.com"
                  className="field mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Subject
              </label>
              <select
                id="subject"
                required
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                className="field mt-1 appearance-none"
              >
                <option value="" disabled>
                  Choose a topic
                </option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Message
              </label>
              <textarea
                id="message"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder="Tell us what's going on..."
                className="field mt-1 resize-none"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {form.message.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
            >
              {busy ? (
                <span className="animate-pulse">Sending…</span>
              ) : (
                <>
                  <Send className="size-4" /> Send message
                </>
              )}
            </button>
          </form>
        )}
      </section>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">
          Looking for fast answers? Check the{" "}
          <Link to="/faq" className="text-signal underline underline-offset-2">
            Help &amp; FAQ
          </Link>{" "}
          page, or visit the{" "}
          <Link to="/disputes" className="text-signal underline underline-offset-2">
            Dispute center
          </Link>{" "}
          if you need to add evidence to an open case.
        </p>
      </div>
    </main>
  );
}
