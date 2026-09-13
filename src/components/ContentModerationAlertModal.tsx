import { AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContentModerationAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRequest: () => void;
}

export function ContentModerationAlertModal({
  open,
  onOpenChange,
  onEditRequest,
}: ContentModerationAlertModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[22rem] overflow-hidden border-0 bg-white p-0 text-slate-900">
        <div className="p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden="true" />
          </div>
          <DialogHeader className="mt-4 space-y-3">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Request Requirements Notice
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600">
              To comply with copyright laws and platform terms, Onlooker Live does not permit
              requests targeting third-party digital apps, ticket feeds, or screen captures. Please
              modify your request to focus entirely on physical, real-world venue logistics (like
              crowd sizes, line lengths, or seat views).
            </DialogDescription>
          </DialogHeader>
          <p className="mt-4 text-xs text-slate-500">
            Enforced under{" "}
            <Link to="/terms" className="underline hover:text-slate-700">
              Section 7 of our Terms of Service
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={onEditRequest}
            className="mt-4 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
          >
            Edit Request
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
