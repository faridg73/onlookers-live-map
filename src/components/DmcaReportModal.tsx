import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copyright, Loader2, ShieldAlert, Ban, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitDmcaNotice } from "@/lib/dmca.functions";
import { toast } from "sonner";

const PROHIBITED = [
  "Screen recording or screenshotting live broadcasts, concerts, or sporting events",
  "Capturing or sharing ticket barcodes, QR codes, or ticketing-app screens",
  "Re-uploading someone else's video or photo as your own live capture",
  "Filming inside a venue where recording is prohibited by the event organizer",
  "Posting watermarked or copyrighted content from third-party platforms",
];

export function DmcaReportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await submitDmcaNotice({
        data: { name, email, contentUrl, description },
      });
      if (!result.success) throw new Error(result.error ?? "Could not submit the report.");
      setDone(true);
      toast.success("Report submitted — our team will review it.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the report.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setName("");
    setEmail("");
    setContentUrl("");
    setDescription("");
    setDone(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-md gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-signal" />
            DMCA / Report Infringement
          </DialogTitle>
          <DialogDescription>
            Report content that infringes copyright or violates our capture rules.
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-xl border border-border bg-surface-raised p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Copyright className="size-4 text-signal" /> Copyright policy
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Onlooker respects the intellectual property rights of others and complies with the
            Digital Millennium Copyright Act (DMCA). We respond to valid notices of alleged
            infringement by removing or disabling access to the reported material, and repeat
            infringers may have their accounts suspended or terminated. All media on Onlooker must
            be filmed live by the uploader's own device camera in public spaces.{" "}
            <Link to="/copyright" className="text-signal underline underline-offset-2">
              Read the full Copyright Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Ban className="size-4 text-destructive" /> Prohibited on Onlooker
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {PROHIBITED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {done ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-live/40 bg-surface-raised px-4 py-6 text-center">
            <CheckCircle2 className="size-8 text-live" />
            <p className="text-sm font-semibold">Report received</p>
            <p className="text-xs text-muted-foreground">
              Your report is logged in our admin review queue and our team has been emailed. We
              review every report and remove infringing content.
            </p>
            <Button variant="outline" className="mt-2" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              required
            />
            <Input
              type="url"
              placeholder="Link to the infringing content (https://…)"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              maxLength={500}
              required
            />
            <Textarea
              placeholder="Describe the infringing material and why you believe it violates your rights (min. 20 characters)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={3000}
              rows={4}
              required
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Submit report
            </Button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Reports go straight to our admin review panel. Knowingly false claims may result in
              liability under 17 U.S.C. §512(f).
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
