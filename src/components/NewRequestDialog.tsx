import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOnlooker } from "@/lib/onlooker-store";

const BOUNTIES = [5, 10, 20, 40];

export function NewRequestDialog({ children }: { children: ReactNode }) {
  const { addRequest } = useOnlooker();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [bounty, setBounty] = useState(10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !place.trim()) return;
    addRequest({ title: title.trim(), place: place.trim(), note: note.trim(), bounty });
    toast.success("Request is live", { description: `$${bounty} bounty posted to nearby onlookers.` });
    setTitle("");
    setPlace("");
    setNote("");
    setBounty(10);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-border bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Ask for a live look</DialogTitle>
          <DialogDescription>
            Someone standing there right now can answer with a photo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="What do you want to see?">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How busy is the boardwalk?"
              className="field"
              required
            />
          </Field>
          <Field label="Where">
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Boardwalk, south entrance"
              className="field"
              required
            />
          </Field>
          <Field label="Details">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="A wide shot is fine — I just need to see the crowd."
              className="field resize-none"
            />
          </Field>
          <Field label="Bounty">
            <div className="flex gap-2">
              {BOUNTIES.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBounty(b)}
                  className={
                    "flex-1 rounded-xl border py-2 font-display text-base transition-colors " +
                    (bounty === b
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-border bg-surface-raised text-muted-foreground hover:border-signal/50")
                  }
                >
                  ${b}
                </button>
              ))}
            </div>
          </Field>
          <button
            type="submit"
            className="w-full rounded-xl bg-signal py-3 text-sm font-semibold uppercase tracking-[0.16em] text-signal-foreground transition-opacity hover:opacity-90"
          >
            Post request
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
