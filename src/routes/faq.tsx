import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, HelpCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Onlooker FAQ — bounties, payouts & rules" },
      {
        name: "description",
        content:
          "Answers to common questions about posting bounties, earning as an Onlooker, payouts, expiration, cancellations, and real estate permissions.",
      },
      { property: "og:title", content: "Onlooker FAQ" },
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
    answer: `Onlooker connects people who need a live view with people already nearby.

• Posters drop a pin on the map, choose a media type (photo, short clip, or live walkthrough), set a cash bounty, and lock the funds in escrow.
• Onlookers browse nearby requests, claim one, go to the pinned location, and capture exactly what was asked for.
• Once the media is accepted, the bounty is released to the Onlooker and the request is marked complete.`
  },
  {
    question: "How are payments and payouts split?",
    answer: `When a bounty is fulfilled and accepted, the locked funds are split automatically:

• 85% goes to the Onlooker who captured the media.
• 15% is retained by Onlooker as a platform fee.

For example, a $20.00 bounty pays the Onlooker $17.00. Payouts land in the Onlooker's wallet immediately and can be cashed out to a connected bank account once the balance reaches the $10.00 minimum.`
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

Once an Onlooker claims the bounty or submits media, cancellation is locked to protect the fulfillment process and the reporter's expected payout.`
  },
  {
    question: "What is the 2-hour review window?",
    answer: `After an Onlooker submits media, the Poster has 2 hours to review it:

• If the media matches the request, the Poster can accept it and release payment.
• If the Poster does nothing, the submission is auto-approved at the end of the 2-hour window and the Onlooker is paid.
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
    answer: `Yes. Anyone can chip in $3 or $5 to increase a bounty pool. Boosts raise the payout for the Onlooker who ultimately fulfills the request, making the request more attractive. Boosts are added to the bounty total and are not refundable once the bounty is fulfilled or expired.`
  },
  {
    question: "What happens if my submission is rejected?",
    answer: `If a Poster rejects your submission or disputes it within the 2-hour window, the bounty remains active and the escrow stays held. Our moderation team reviews disputes and decides whether to release the payout, return funds to the Poster, or request a resubmission. Repeat low-quality submissions may affect your Onlooker rating.`
  },
];

function FAQScreen() {
  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-signal text-signal-foreground">
          <HelpCircle className="size-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-tight text-foreground">
            Help &amp; FAQ
          </h1>
          <p className="text-sm text-muted-foreground">
            Bounties, payouts, rules, and real estate guidelines.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {SECTIONS.map(({ question, answer }) => (
          <Collapsible key={question}>
            <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:bg-surface-raised">
              <span className="pr-4 text-sm font-medium text-foreground">
                {question}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="rounded-b-2xl border-x border-b border-border bg-surface px-4 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {answer}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

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
