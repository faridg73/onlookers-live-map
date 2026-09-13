import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Onlooker live view bounties" },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Onlooker Terms of Service &amp; Legal Disclaimer
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        By downloading, installing, accessing, or signing into Onlooker (the &ldquo;Platform&rdquo;),
        you (&ldquo;User&rdquo;, &ldquo;Creator&rdquo;, or &ldquo;Participant&rdquo;) unconditionally
        accept and agree to be bound by these Terms of Service. If you do not agree, you must
        immediately uninstall the app and cease all use.
      </p>

      <Section title="Platform Role as Passive Host">
        <p>
          Onlooker operates exclusively as a peer-to-peer software platform and technological
          intermediary that connects individuals posting media requests (&ldquo;Posters&rdquo;) with
          individuals fulfilling requests (&ldquo;Fulfillers&rdquo;). Onlooker is not a publisher,
          employer, agent, or security supervisor of its users, exercises no control over physical
          field activities, and disclaims all liability arising from real-world interactions.
        </p>
      </Section>

      <Section title="User Conduct, Legality &amp; Compliance Mandates">
        <p>
          <strong className="text-foreground">Strict adherence to law.</strong> Users must comply
          with all applicable local, state, federal, and international laws, statutes, ordinances,
          and regulations while using the Platform or fulfilling bounties.
        </p>
        <p>
          <strong className="text-foreground">Public spaces &amp; expectation of privacy.</strong>{" "}
          Users are strictly prohibited from capturing, recording, or streaming video in areas where
          a reasonable expectation of privacy exists under applicable law (such as private
          residences, bathrooms, locker rooms, or restricted corporate interiors). All recordings
          must take place strictly within lawful public thoroughfares or areas with open public
          access.
        </p>
        <p>
          <strong className="text-foreground">Prohibition of trespassing &amp; encroachment.</strong>{" "}
          Users shall not trespass onto private property, break through physical or digital security
          barriers, or enter restricted zones without explicit, verifiable authorization.
        </p>
        <p>
          <strong className="text-foreground">
            Credentials &amp; authorization for specialized bounties.
          </strong>{" "}
          If a bounty or request involves restricted premises, private commercial spaces, or matters
          requiring official standing, the user warrants that they possess all necessary licenses,
          permits, legal credentials, and proper authorization before attempting fulfillment. Users
          must never impersonate law enforcement officers, government officials, or authorized
          security personnel.
        </p>
        <p>
          <strong className="text-foreground">Prohibition of harassment &amp; illegal acts.</strong>{" "}
          Users agree not to use Onlooker to stalk, harass, intimidate, threaten, or record
          individuals in a manner that violates personal rights, privacy torts, or anti-harassment
          statutes.
        </p>
      </Section>

      <Section title="Content Ownership, Moderation &amp; Rights">
        <p>
          <strong className="text-foreground">User content responsibility.</strong> Users retain
          ownership of the videos and media they create, but grant Onlooker a worldwide,
          non-exclusive, royalty-free, transferable license to store, host, display, and stream
          uploaded content to fulfill platform operations.
        </p>
        <p>
          <strong className="text-foreground">Zero-tolerance moderation &amp; content removal.</strong>{" "}
          Onlooker reserves the right—but assumes no obligation—to review, moderate, flag, suspend,
          or permanently delete any bounty, user profile, or uploaded video that violates these
          terms, depicts illegal acts, or exposes the Platform to legal risk, without prior notice
          or compensation.
        </p>
      </Section>

      <Section title="Assumption of Risk, Liability Waiver &amp; Indemnification">
        <p>
          <strong className="text-foreground">Explicit assumption of risk.</strong> Participation in
          crowdsourced media recording and bounty hunting carries inherent physical, legal, and
          financial hazards, including but not limited to physical confrontation, accidents,
          property damage, civil citations, and criminal arrest. Users voluntarily and knowingly
          assume all such risks.
        </p>
        <p>
          <strong className="text-foreground">Full release of liability.</strong> To the maximum
          extent permitted by law, Onlooker, its creators, founders, officers, employees, and
          partners shall not be held liable for any direct, indirect, incidental, special,
          consequential, or punitive damages—including personal injury, property loss, legal fees,
          or financial penalties—arising out of or in connection with app usage or field activities.
        </p>
        <p>
          <strong className="text-foreground">Mandatory indemnification.</strong> You agree to
          defend, indemnify, and hold harmless Onlooker and its affiliates from and against any
          claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including
          reasonable attorneys&rsquo; fees) resulting from your violation of these terms,
          infringement of third-party rights, or any unlawful actions taken while using the
          Platform.
        </p>
      </Section>

      <Section title="User-Generated Content and Real-World Platform Utility">
        <p>
          <strong className="text-foreground">Physical-Capture Restriction.</strong> Onlooker Live
          is strictly a platform designed to crowdsource real-time, real-world visual logistics of
          physical locations (e.g., foot-traffic density, entry-line lengths, parking availability,
          and stadium seat configurations). You agree that you will only fulfill requests and post
          content captured through your device&apos;s physical, outward-facing camera lens looking at
          physical space.
        </p>
        <p>
          <strong className="text-foreground">
            Prohibition on Digital Screen Captures and Third-Party Platforms.
          </strong>{" "}
          You are explicitly prohibited from recording, streaming, snapshotting, uploading, or
          transmitting any content that captures digital displays, software user interfaces, or
          mobile applications owned by third parties. This includes, but is not limited to,
          ticketing platforms, digital ticket barcodes, QR codes, live broadcast feeds, or
          proprietary streaming interfaces (such as Ticketmaster, StubHub, Live Nation, or
          equivalent services).
        </p>
        <p>
          <strong className="text-foreground">Indemnification &amp; Liability for Breach.</strong>{" "}
          Onlooker Live employs automated keyword filters and technical restrictions to block digital
          application recordings. Circumvention of these safeguards constitutes a material breach of
          these Terms. You agree to indemnify, defend, and hold harmless Onlooker Live, its
          parents, subsidiaries, and affiliates from any claims, liabilities, losses, damages,
          costs, or expenses (including reasonable attorneys&apos; fees) arising out of or related to
          your distribution of unauthorized third-party digital property or copyrighted material on
          the platform.
        </p>
      </Section>

      <Link
        to="/auth"
        className="mt-10 inline-block rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
      >
        Back to sign in
      </Link>
    </div>
  );
}
