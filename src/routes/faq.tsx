import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HelpCircle, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Onlooker LLC FAQ, bounties, payouts & rules" },
      {
        name: "description",
        content:
          "Answers to common questions about posting bounties, earning as an Onlooker LLC, payouts, expiration, cancellations, and real estate permissions.",
      },
      { property: "og:title", content: "Onlooker LLC FAQ" },
      {
        property: "og:description",
        content:
          "How bounties work, payment splits, expiry rules, and real estate guidelines.",
      },
    ],
  }),
  component: FAQScreen,
});

const SECTIONS = [
  {
    question: "How do bounties work?",
    answer: `Onlooker LLC connects people who need a live view with people already nearby.

• Posters drop a pin on the map, choose a media type (photo, short clip, or live walkthrough), set a cash bounty, and lock the funds in escrow.
• Onlookers browse nearby requests, claim one, go to the pinned location, and capture exactly what was asked for.
• Once the media is accepted, the bounty is released to the Onlooker LLC and the request is marked complete.`
  },
  {
    question: "How are payments and payouts split?",
    answer: `When a bounty is fulfilled and accepted, the locked funds are split automatically:

• 85% goes to the Onlooker LLC who captured the media.
• 15% is retained by Onlooker LLC as a platform fee.

For example, an 80 Credits bounty pays the Onlooker LLC 68 Credits. Credits land in the Onlooker LLC's wallet immediately, and 4 Credits are always worth $1.00 when cashed out to a connected bank account (40 Credits minimum).`
  },
  {
    question: "When does a bounty expire?",
    answer: `Every bounty has a deadline set by the Poster. If no acceptable media is submitted before the timer runs out, the bounty expires automatically:

• The request status changes to expired/closed.
• No new claims or submissions are accepted.
• Chip In contributions are disabled.
• The Poster's full escrow deposit is refunded to their wallet.

Expired bounties are removed from the active map and feed.`
  },
  {
    question: "Can I cancel a bounty after posting it?",
    answer: `Yes, but only if nobody has engaged with it yet. You can cancel and receive a full escrow refund when:

• The bounty has zero claims.
• There are zero active submissions or uploaded clips.

Once an Onlooker LLC claims the bounty or submits media, cancellation is locked to protect the fulfillment process and the reporter's expected payout.`
  },
  {
    question: "What is the 2-hour review window?",
    answer: `After an Onlooker LLC submits media, the Poster has 2 hours to review it:

• If the media matches the request, the Poster can accept it and release payment.
• If the Poster does nothing, the submission is auto-approved at the end of the 2-hour window and the Onlooker LLC is paid.
• If the Poster disputes the submission within the window, the escrow is held securely until the dispute is resolved by our moderation team.

This window protects both sides and keeps payouts moving fairly.`
  },
  {
    question: "Real estate permission guidelines",
    answer: `Real estate and open-house bounties often involve private property. Before posting or fulfilling one, you must confirm:

• You have explicit authorization from the seller, listing agent, property manager, or other authorized party.
• You will not enter private property without permission.
• You will not record inside homes, restricted interiors, or areas where occupants have a reasonable expectation of privacy.

Posting a real estate bounty requires checking the authorization box in the request form. False claims may result in account suspension.`
  },
  {
    question: "Can I boost an existing bounty?",
    answer: `Yes. Anyone can chip in 4, 8 or 20 Credits to increase a bounty pool. Boosts raise the payout for the Onlooker LLC who ultimately fulfills the request, making the request more attractive. Boosts are added to the bounty total and are not refundable once the bounty is fulfilled or expired.`
  },
  {
    question: "What happens if my submission is rejected?",
    answer: `If a Poster rejects your submission or disputes it within the 2-hour window, the bounty remains active and the escrow stays held. Our moderation team reviews disputes and decides whether to release the payout, return funds to the Poster, or request a resubmission. Repeat low-quality submissions may affect your Onlooker LLC rating.`
  },
];

function FAQScreen() {
  const navigate = useNavigate();
  return (
    <div className="reading-shell pb-28 pt-safe">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-signal text-signal-foreground">
            <HelpCircle className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-foreground">
              Help &amp; FAQ
            </h1>
            <p className="text-sm text-muted-foreground">
              Bounties, payouts, rules, and real estate guidelines.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close help and FAQ"
          onClick={() => void navigate({ to: "/" })}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" />
        </button>
      </header>

      <Accordion type="single" collapsible defaultValue="real-estate" className="space-y-3">
        {SECTIONS.map(({ question, answer }) => (
          <AccordionItem
            key={question}
            value={question === "Real estate permission guidelines" ? "real-estate" : question}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <AccordionTrigger className="min-h-14 px-4 py-4 text-left text-sm font-medium text-foreground hover:bg-surface-raised hover:no-underline">
              <span className="pr-4">{question}</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-1">
              <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {answer}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">
          Still have questions?{" "}
          <Link to="/contact" className="text-signal underline underline-offset-2">
            Contact support
          </Link>{" "}
          or review our{" "}
          <Link to="/terms" className="text-signal underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-signal underline underline-offset-2">
            Privacy Policy
          </Link>{" "}
          for the full legal details.
        </p>
      </div>
    </div>
  );
}
