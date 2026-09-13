import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Footer } from "@/components/Footer";
import { submitDmcaNotice } from "@/lib/dmca.functions";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "DMCA / Report Infringement — Onlooker Live" },
      {
        name: "description",
        content:
          "Report copyrighted material on Onlooker Live. Submit a DMCA notice and our team will review it promptly.",
      },
      { property: "og:title", content: "DMCA / Report Infringement — Onlooker Live" },
      {
        property: "og:description",
        content: "Submit a copyright infringement report for review by the Onlooker Live team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DmcaPage,
});

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none";

function DmcaPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const result = await submitDmcaNotice({
        data: { name, email, contentUrl, description },
      });
      if (!result.success) throw new Error(result.error ?? "Submission failed.");
      setDone(true);
      toast.success("Report received. Our team will review it promptly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-signal/15 text-signal">
            <ShieldAlert className="size-5" />
          </span>
          <h1 className="font-display text-xl font-extrabold text-foreground">
            DMCA / Report Infringement
          </h1>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Onlooker Live is built around user-generated views of public spaces — crowds, streets,
          tailgates, and venue surroundings. If you believe content on Onlooker Live infringes your
          copyright, tell us below and our team will review it promptly. Read our{" "}
          <a
            href="/copyright"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            DMCA &amp; Copyright Policy
          </a>{" "}
          first.
        </p>

        {done ? (
          <div className="mt-6 rounded-2xl border border-signal/40 bg-signal/10 p-5 text-sm text-foreground">
            <p className="font-semibold">Report submitted.</p>
            <p className="mt-1 text-muted-foreground">
              We've logged your notice and alerted our support team at support@onlookerlive.com.
              We'll follow up at the email you provided.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your name
              </span>
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full legal name"
                className={field}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your email
              </span>
              <input
                required
                type="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={field}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Content URL
              </span>
              <input
                required
                type="url"
                maxLength={500}
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://onlookerlive.com/b/…"
                className={field}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description of the infringing material
              </span>
              <textarea
                required
                minLength={20}
                maxLength={3000}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Identify the copyrighted work and explain how the linked content infringes it."
                className={`${field} resize-none`}
              />
            </label>

            <button
              type="submit"
              disabled={sending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-60"
            >
              {sending && <Loader2 className="size-4 animate-spin" />}
              Submit report
            </button>

            <p className="text-center text-[0.7rem] leading-relaxed text-muted-foreground">
              Submitting a false claim may carry legal consequences. Your report is sent to
              support@onlookerlive.com and logged for admin review.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
