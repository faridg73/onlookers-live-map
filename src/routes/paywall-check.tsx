// Temporary visual check route.
import { createFileRoute } from "@tanstack/react-router";
import { ProPaywallDialog } from "@/components/pro/ProPaywallDialog";

export const Route = createFileRoute("/paywall-check")({
  component: () => <ProPaywallDialog reason="trial-exhausted" trialVisitsUsed={2} onClose={() => {}} />,
});
