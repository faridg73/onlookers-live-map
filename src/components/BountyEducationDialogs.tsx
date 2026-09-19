import { Check, Coins, KeyRound, MapPin, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type FirstPostGuideProps = {
  open: boolean;
  hideNextTime: boolean;
  onHideNextTimeChange: (checked: boolean) => void;
  onOpenChange: (open: boolean) => void;
};

const GUIDE_STEPS = [
  {
    icon: MapPin,
    label: "Choose the view",
    copy: "Pick a category, a precise location, and describe what you want captured.",
  },
  {
    icon: Coins,
    label: "Fund it securely",
    copy: "Your reward is held by Onlooker LLC while a nearby creator completes the bounty.",
  },
  {
    icon: ShieldCheck,
    label: "Review, then release",
    copy: "Review the submitted footage before the eligible payout moves forward.",
  },
] as const;

export function FirstPostGuide({
  open,
  hideNextTime,
  onHideNextTimeChange,
  onOpenChange,
}: FirstPostGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto border-signal/30 bg-surface p-0 shadow-[0_24px_80px_color-mix(in_oklab,var(--signal)_14%,transparent)] backdrop-blur-xl sm:max-w-lg">
        <div className="border-b border-border bg-signal/5 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pb-6 sm:pt-7">
          <div className="mb-4 grid size-11 place-items-center rounded-full border border-signal/40 bg-signal/10 text-signal shadow-[0_0_28px_color-mix(in_oklab,var(--signal)_22%,transparent)]">
            <Sparkles className="size-5" />
          </div>
          <DialogHeader className="text-left">
            <p className="text-xs font-extrabold uppercase text-signal">Your first paid bounty</p>
            <DialogTitle className="font-display text-2xl font-extrabold leading-tight text-foreground">
              Turn a question into a real-world view
            </DialogTitle>
            <DialogDescription className="leading-relaxed text-muted-foreground">
              A nearby creator captures what is happening now. You stay in control of the brief,
              location, timing, and reward.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-5 sm:px-7">
          {GUIDE_STEPS.map(({ icon: Icon, label, copy }, index) => (
            <div key={label} className="flex gap-3 rounded-lg border border-border bg-background/70 p-3.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full border border-signal/30 bg-signal/10 text-signal">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="font-display font-extrabold text-foreground">
                  <span className="mr-2 text-signal">0{index + 1}</span>{label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-border bg-background/50 px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-bold text-foreground">Don&apos;t show this again</span>
              <span className="block text-xs text-muted-foreground">You can start future bounties immediately.</span>
            </span>
            <Switch checked={hideNextTime} onCheckedChange={onHideNextTimeChange} aria-label="Don't show this introduction again" />
          </label>
          <Button type="button" className="h-12 w-full bg-signal font-extrabold text-signal-foreground" onClick={() => onOpenChange(false)}>
            Build my bounty
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type RealEstateSecurityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RealEstateSecurityDialog({ open, onOpenChange }: RealEstateSecurityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto border-signal/30 bg-surface p-0 shadow-[0_24px_80px_color-mix(in_oklab,var(--signal)_14%,transparent)] backdrop-blur-xl sm:max-w-md">
        <div className="border-b border-border bg-signal/5 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pt-7">
          <div className="mb-4 grid size-12 place-items-center rounded-full border border-signal/40 bg-signal/10 text-signal shadow-[0_0_28px_color-mix(in_oklab,var(--signal)_22%,transparent)]">
            <KeyRound className="size-6" />
          </div>
          <DialogHeader className="text-left">
            <p className="text-xs font-extrabold uppercase text-signal">Protected property visit</p>
            <DialogTitle className="font-display text-2xl font-extrabold leading-tight text-foreground">
              Real Estate security handshake
            </DialogTitle>
            <DialogDescription className="leading-relaxed text-muted-foreground">
              Every property bounty uses a three-step safeguard before footage or payout can move forward.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-3 px-5 sm:px-7">
          {[
            ["Escrow lock", "Onlooker LLC securely holds the bounty reward when the request goes live."],
            ["Private 6-digit PIN", "A unique code and claim link are sent to your authorized property contact."],
            ["On-site verification", "The creator must receive and enter the PIN at the property before capture and payout unlock."],
          ].map(([label, copy], index) => (
            <div key={label} className="flex gap-3 rounded-lg border border-border bg-background/70 p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal font-display text-sm font-extrabold text-signal-foreground">
                {index + 1}
              </span>
              <span>
                <strong className="block text-sm text-foreground">{label}</strong>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{copy}</span>
              </span>
            </div>
          ))}
          <p className="flex gap-2 rounded-lg border border-signal/30 bg-signal/5 p-3 text-xs leading-relaxed text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-signal" />
            You will confirm authorization and add the agent&apos;s phone or email before posting.
          </p>
        </div>

        <div className="border-t border-border bg-background/50 px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
          <Button type="button" className="h-12 w-full bg-signal font-extrabold text-signal-foreground" onClick={() => onOpenChange(false)}>
            I understand — continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}