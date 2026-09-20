// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InlineSignIn } from "@/components/InlineSignIn";

type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
};

/**
 * A light sign-in overlay that sits on top of whatever the person is doing.
 * Nothing on the page behind it is unmounted, so the work in progress — a
 * half-filled bounty form, for example — is exactly as they left it once the
 * overlay closes itself after a successful sign-in.
 */
export function SignInDialog({ open, onOpenChange, title = "Sign in to continue", message }: SignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto border-border bg-surface p-0 sm:max-w-md">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <InlineSignIn title={title} message={message ?? "Your bounty details stay exactly as you left them."} />
      </DialogContent>
    </Dialog>
  );
}
