import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type PageBackButtonProps = {
  label: string;
  fallback?: "/" | "/profile" | "/discover";
  className?: string;
};

export function PageBackButton({ label, fallback = "/", className }: PageBackButtonProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const goBack = () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }
    void navigate({ to: fallback });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={goBack}
      aria-label={`Back to ${label}`}
      className={`h-11 min-w-11 rounded-full border border-border bg-secondary/80 px-3 text-sm font-bold text-foreground shadow-sm ${className ?? ""}`}
    >
      <ArrowLeft className="size-5 text-signal" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}