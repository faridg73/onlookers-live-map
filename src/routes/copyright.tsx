// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

export const Route = createFileRoute("/copyright")({
  head: () => ({
    meta: [
      { title: "DMCA & Copyright Policy | Onlooker LLC" },
      {
        name: "description",
        content:
          "Onlooker LLC DMCA and copyright infringement policy: prohibited digital content, takedown notices, counter-notifications, and repeat infringer policy.",
      },
      { property: "og:title", content: "DMCA & Copyright Policy | Onlooker LLC" },
      {
        property: "og:description",
        content:
          "How to report copyright infringement on Onlooker LLC and our DMCA takedown procedures.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CopyrightPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg tracking-tight text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function CopyrightPage() {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  };

  return (
    <div className="reading-shell pb-28 pt-[max(env(safe-area-inset-top),3rem)]">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          DMCA &amp; <span className="text-signal">Copyright Infringement Policy</span>
        </h1>
        <button
          type="button"
          aria-label="Close DMCA & Copyright Infringement Policy"
          onClick={close}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
      </header>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Last updated: September 2026
      </p>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Onlooker LLC (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
        respects the intellectual property rights of others and expects its users to do the same. In
        accordance with the Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;), Pub. L. 105-304, we
        will respond expeditiously to clear notices of alleged copyright infringement that are reported
        to our Designated Copyright Agent identified below.
      </p>

      <Section title="1. Prohibited digital content & screen captures">
        <p>
          Onlooker LLC is strictly a platform for crowdsourcing real-world, physical, location-based
          utility (for example line lengths, venue atmospheres, physical seat views). The broadcasting,
          streaming, screen-recording, or screenshotting of third-party digital interfaces,
          applications, mobile tickets, barcodes, or live event feeds (including but not limited to
          Ticketmaster, StubHub, Live Nation, or premium broadcast streams) is explicitly prohibited on
          our platform.
        </p>
      </Section>

      <Section title="2. Filing a notification of claimed infringement">
        <p>
          If you are a copyright owner, authorized to act on behalf of one, or authorized to act under
          any exclusive right under copyright, please report alleged copyright infringements taking place
          on or through the Onlooker LLC platform by submitting a written DMCA Notice to our
          Designated Agent.
        </p>
        <p>Your notice must substantially include the following information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            A physical or electronic signature of the copyright owner or a person authorized to act on
            their behalf;
          </li>
          <li>Identification of the copyrighted work claimed to have been infringed;</li>
          <li>
            Identification of the material that is claimed to be infringing or to be the subject of
            infringing activity, including specific URLs, request IDs, or geo-coordinates within the
            Onlooker LLC app to help us locate the material;
          </li>
          <li>
            Your contact information, including your address, telephone number, and an email address;
          </li>
          <li>
            A statement by you that you have a good-faith belief that use of the material in the manner
            complained of is not authorized by the copyright owner, its agent, or the law; and
          </li>
          <li>
            A statement that the information in the notification is accurate, and under penalty of
            perjury, that you are authorized to act on behalf of the copyright owner.
          </li>
        </ul>
      </Section>

      <Section title="3. Where to submit your notice">
        <p>
          Please deliver all infringement notifications to our Designated Agent through the{" "}
          <Link
            to="/contact"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Contact &amp; Support page
          </Link>{" "}
          (Subject: DMCA Takedown Notice).
        </p>
      </Section>

      <Section title="4. Counter-notifications">
        <p>
          If you believe that your content was removed or disabled by mistake or misidentification, you
          may file a counter-notification with us through the{" "}
          <Link
            to="/contact"
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Contact &amp; Support page
          </Link>
          . Your counter-notification must include your physical or electronic signature,
          identification of the material that was removed, and a statement under penalty of perjury
          that you have a good faith belief that the material was removed as a result of mistake or
          misidentification.
        </p>
      </Section>

      <Section title="5. Repeat infringer policy">
        <p>
          In accordance with the DMCA and other applicable laws, Onlooker LLC maintains a strict policy
          of terminating, in appropriate circumstances and at our sole discretion, users who are deemed
          to be repeat infringers. We also reserve the right to ban any user who attempts to upload
          digital media captured from third-party mobile applications.
        </p>
      </Section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/dmca"
          className="inline-block rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
        >
          Submit a DMCA report
        </Link>
        <Link
          to="/terms"
          className="inline-block rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
