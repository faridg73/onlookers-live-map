import { createFileRoute, Link } from "@tanstack/react-router";
import { PrivacyBody } from "@/components/legal/legal-content";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Onlooker live view bounties" },
      {
        name: "description",
        content:
          "How Onlooker collects and uses account details, precise GPS location and uploaded bounty videos, plus your deletion and consent rights.",
      },
      { property: "og:title", content: "Onlooker Privacy Policy" },
      {
        property: "og:description",
        content:
          "Account data, real-time location, camera media, retention, sharing and your rights on Onlooker.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="reading-shell pb-28 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Onlooker Privacy Policy
      </h1>
      <div className="mt-2">
        <PrivacyBody />
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        See also our{" "}
        <Link to="/terms" className="font-semibold text-foreground underline underline-offset-4">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}

