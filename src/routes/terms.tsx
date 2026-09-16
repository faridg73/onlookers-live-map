import { createFileRoute, Link } from "@tanstack/react-router";
import { TermsBody } from "@/components/legal/legal-content";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | Onlooker live view bounties" },
      {
        name: "description",
        content:
          "Onlooker's Terms of Service: platform role, lawful recording rules, content rights, assumption of risk, liability waiver and indemnification.",
      },
      { property: "og:title", content: "Onlooker Terms of Service" },
      {
        property: "og:description",
        content:
          "Read the rules for posting and fulfilling live view bounties on Onlooker, including safety, privacy and liability terms.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Onlooker Terms of Service &amp; Legal Disclaimer
      </h1>
      <div className="mt-3">
        <TermsBody />
      </div>

      <Link
        to="/auth"
        className="mt-10 inline-block rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
      >
        Back to sign in
      </Link>
    </div>
  );
}

