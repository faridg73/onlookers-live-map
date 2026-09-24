// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Clock3,
  HardHat,
  Home,
  KeyRound,
  Mail,
  MessageSquareText,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { PageBackButton } from "@/components/PageBackButton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Verified On-Site Visits — The Onlooker Handshake | Onlooker" },
      {
        name: "description",
        content:
          "Onlooker's PIN handshake verifies every on-site visit end to end: a one-time code for the property contact, escrow held until verification, and a built-in decline path. Built for real estate agents, property managers, and home builders.",
      },
      { property: "og:title", content: "Verified On-Site Visits — The Onlooker Handshake" },
      {
        property: "og:description",
        content:
          "A one-time PIN, an on-site check, escrow released only on verification. A new end-to-end trusted way to get eyes on any property.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerificationScreen,
});

const STEPS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: CircleDollarSign,
    title: "Post a verified bounty",
    body: "Describe the property or site you need eyes on, add the on-site contact's name, phone or email, and fund the bounty. Payment sits in escrow — nothing is released yet.",
  },
  {
    icon: MessageSquareText,
    title: "The contact gets a one-time PIN",
    body: "We text and email a single-use 6-digit PIN straight to the agent, manager, or site contact. They never need an Onlooker account.",
  },
  {
    icon: KeyRound,
    title: "The handshake happens on site",
    body: "The Onlooker arrives, films, and the contact reads out the PIN. The Onlooker types it into the app — only a match marks the visit verified on site.",
  },
  {
    icon: BadgeCheck,
    title: "Verification unlocks the payout",
    body: "A verified visit unlocks footage submission and releases the escrowed payout. No handshake, no payout — you never pay for a visit that didn't happen.",
  },
];

const PROTECTIONS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Clock3,
    title: "Single-use and always expiring",
    body: "Every PIN works exactly once and stops working when the request closes. A leaked or old PIN is worthless.",
  },
  {
    icon: ShieldX,
    title: "One-tap decline, no account needed",
    body: "If the contact never authorized the visit, a secure link in their message cancels it instantly. You're refunded and the Onlooker still receives a trip fee for their time.",
  },
  {
    icon: Undo2,
    title: "Unreachable? You're covered",
    body: "If the Onlooker arrives and no PIN ever arrives, they can report the contact unreachable after a fair wait. You get the bounty back minus a small kill fee for the wasted trip.",
  },
  {
    icon: Smartphone,
    title: "Resend on your terms",
    body: "PINs can be resent to the contact when plans change, with a full delivery history on every bounty so nothing happens in the dark.",
  },
];

const AUDIENCES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Home,
    title: "Real estate agents",
    body: "Get verified walkthrough footage of a listing without driving across town — and know the filming actually happened on your property, with your authorization.",
  },
  {
    icon: Building2,
    title: "Property managers",
    body: "Verify unit conditions, move-out states, and contractor claims with PIN-verified visits you can trust and dispute-proof records.",
  },
  {
    icon: HardHat,
    title: "Home builders",
    body: "Check on-site progress, deliveries, and staging at any build with a verified visit — no more taking someone's word over the phone.",
  },
];

function VerificationScreen() {
  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <PageBackButton label="Home" fallback="/" />

        {/* Hero */}
        <header className="mt-8 text-center">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-signal">
            The Onlooker Handshake
          </p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            Verified on-site visits, end to end.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Anyone can promise to visit a property. Onlooker proves it. A one-time PIN,
            an on-site handshake, and escrow that only releases on verification — a new,
            trusted way to get things done without being there yourself.
          </p>
        </header>

        {/* How it works */}
        <section className="mt-12" aria-labelledby="handshake-steps">
          <h2 id="handshake-steps" className="text-center text-lg font-bold text-foreground">
            How the handshake works
          </h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-signal/40 bg-signal/10">
                    <step.icon className="size-5 text-signal" aria-hidden />
                  </span>
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    Step {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Protections */}
        <section className="mt-12" aria-labelledby="handshake-protections">
          <h2 id="handshake-protections" className="text-center text-lg font-bold text-foreground">
            Trust built into every step
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {PROTECTIONS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <span className="flex size-9 items-center justify-center rounded-lg border border-signal/40 bg-signal/10">
                  <item.icon className="size-4.5 text-signal" aria-hidden />
                </span>
                <h3 className="mt-3 font-bold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audiences */}
        <section className="mt-12" aria-labelledby="handshake-audiences">
          <h2 id="handshake-audiences" className="text-center text-lg font-bold text-foreground">
            Built for property professionals
          </h2>
          <div className="mt-6 space-y-4">
            {AUDIENCES.map((aud) => (
              <div
                key={aud.title}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-signal/40 bg-signal/10">
                  <aud.icon className="size-5 text-signal" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">{aud.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{aud.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-2xl border border-signal/40 bg-signal/5 p-6 text-center">
          <ShieldCheck className="mx-auto size-8 text-signal" aria-hidden />
          <h2 className="mt-3 text-lg font-bold text-foreground">Try a verified visit</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Post a bounty with PIN verification and see the property through trusted eyes —
            your payment stays in escrow until the handshake proves the visit happened.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="h-11 rounded-xl bg-signal px-6 font-bold uppercase text-signal-foreground hover:brightness-110">
              <Link to="/post">
                <CircleDollarSign className="size-4" /> Post a verified bounty
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl border-border bg-transparent px-6 font-bold uppercase text-foreground/85 hover:border-signal/60 hover:text-signal"
            >
              <Link to="/faq">
                <Mail className="size-4" /> Read the FAQ
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
