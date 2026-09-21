// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Building2,
  HelpCircle,
  Radio,
  ShieldCheck,
  Siren,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Help Center | Onlooker" },
      {
        name: "description",
        content:
          "Get help with Onlooker bounties, payouts, community reporting, live media, real estate verification, account safety, and compliance.",
      },
      { property: "og:title", content: "Onlooker Help Center" },
      {
        property: "og:description",
        content:
          "Clear guidance for bounties, reporting, streaming, property verification, safety, and platform policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FAQScreen,
});

type CategoryId = "bounties" | "reporting" | "streaming" | "real-estate" | "account";

type FAQCategory = {
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  questions: Array<{ question: string; answer: string }>;
};

const CATEGORIES: FAQCategory[] = [
  {
    id: "bounties",
    label: "Bounties & Payouts",
    shortLabel: "Bounties",
    description: "Posting, escrow, review windows, credits, and cash-outs.",
    icon: BadgeDollarSign,
    questions: [
      {
        question: "How does a Paid Flash Bounty work?",
        answer: `A poster chooses what they need to see, sets the location, instructions, deadline, and reward, then funds the request with Credits. The reward is locked in escrow while nearby onlookers can claim and fulfill it. The assigned onlooker captures the requested photo, video, or live view and submits it for review. Payment is released after approval or when the review window ends without a valid dispute.`,
      },
      {
        question: "How are bounty payments split?",
        answer: `For an accepted fulfillment, 85% of the bounty goes to the onlooker who captured the media and 15% is retained by Onlooker as the platform fee. For example, an 80-Credit bounty pays 68 Credits to the onlooker. The complete amount and split are shown before the poster confirms the request.`,
      },
      {
        question: "What is the two-hour review window?",
        answer: `After media is submitted, the poster has two hours to review it. The poster may approve a submission that fulfills the instructions or open a dispute when it does not. If no action is taken during the window, the submission is automatically approved and the onlooker is paid. A timely dispute keeps the escrow locked while the evidence is reviewed.`,
      },
      {
        question: "What happens if a bounty expires or is cancelled?",
        answer: `An unfulfilled bounty closes when its deadline passes and its remaining escrow returns to the poster's wallet. A poster may cancel for a full refund only before anyone has claimed the bounty or submitted media. Once fulfillment work begins, cancellation is restricted to protect the onlooker's expected payout. Contributions that have already funded a completed bounty are not refundable.`,
      },
      {
        question: "How do Credits, top-ups, and cash-outs work?",
        answer: `Four Credits equal $1.00. Posters can add Credits through the secure purchase flow, and earned Credits appear in the onlooker's wallet after payout. Cash-out requests require at least 40 Credits and a connected payout method. Requests are reviewed for account security, velocity, fraud signals, and payment compliance before funds are sent.`,
      },
    ],
  },
  {
    id: "reporting",
    label: "Emergency & Community Reporting",
    shortLabel: "Reporting",
    description: "Trust levels, incident lanes, validation, and report status.",
    icon: Siren,
    questions: [
      {
        question: "Who can create an emergency or community report?",
        answer: `All new accounts begin at Level 1. Level 1 and Level 2 members may use lower-risk Traffic, Hazard, and Community report lanes. High-impact Fire, Police, and Medical reports are reserved for active Level 3 Verified Creators or First Responders. The same restriction is enforced when a report is submitted, not only by the visible controls.`,
      },
      {
        question: "How do validation, flags, and report statuses work?",
        answer: `Level 2 and Level 3 members may validate reports, while signed-in members may flag inaccurate, unsafe, or outdated information. Community signals contribute to the report's trust score. Reports are labeled Unverified, Confirmed, Disputed, or Expired according to validation and flag thresholds, age, and system checks. Status can change as new evidence arrives.`,
      },
      {
        question: "What reporting rules must I follow?",
        answer: `Report only what you can observe accurately. Do not submit pranks, guesses presented as facts, staged incidents, private information, or content that puts anyone in danger. Every reporter must accept the false-report pledge before submitting. Intentional false reports may result in immediate suspension and a permanent platform ban.`,
      },
      {
        question: "Does Onlooker replace emergency services?",
        answer: `No. Community reports are informational, community-driven updates and are not an emergency dispatch service. Do not approach danger or interfere with responders. For a life-threatening emergency, leave the area when appropriate and call 911 or the applicable local emergency number first.`,
      },
    ],
  },
  {
    id: "streaming",
    label: "Live Streaming & Media",
    shortLabel: "Streaming",
    description: "Camera access, uploads, acceptable capture, and privacy.",
    icon: Radio,
    questions: [
      {
        question: "How do I start and finish a live broadcast?",
        answer: `Choose POST, select the broadcast option, choose a category and vibe, set a location and audience, then grant camera and microphone access. On supported phones, Onlooker Live uses the device's native front or rear camera. Desktop devices can use a webcam or upload a file. Ending a broadcast opens a wrap-up confirming upload status and available stream results.`,
      },
      {
        question: "What can I record or upload?",
        answer: `Capture only lawful, relevant, real-world media that matches the selected category or bounty instructions. Do not record where people reasonably expect privacy, enter restricted property, obstruct public safety activity, or upload unlawful, exploitative, misleading, or copyrighted third-party broadcasts. Venue and local recording rules still apply.`,
      },
      {
        question: "Why is my video processing or unavailable?",
        answer: `Uploads can briefly show a processing or media-analysis state while the file is secured and prepared for playback. Keep the app open until upload confirmation appears. If playback is unavailable, use the provided open/download fallback, check your connection, and confirm the browser supports the recording format. Re-uploading a compatible MP4 or WebM file may resolve device-specific playback issues.`,
      },
      {
        question: "Who can see my broadcast or submitted media?",
        answer: `Visibility follows the audience selected at posting and the purpose of the content. Public or nearby broadcasts may appear in discovery surfaces, while bounty media is shared through the request and review flow. Onlooker may retain and review relevant media for safety, disputes, legal compliance, and enforcement as described in the Privacy Policy and Terms of Service.`,
      },
    ],
  },
  {
    id: "real-estate",
    label: "Real Estate & Verification",
    shortLabel: "Real Estate",
    description: "Authorization, agent contact, PIN handshakes, and payout unlocks.",
    icon: Building2,
    questions: [
      {
        question: "What authorization is required for a property bounty?",
        answer: `The poster must have explicit authorization from the seller, listing agent, property manager, or another authorized party. The posting form requires this confirmation. Neither posters nor onlookers may enter private property, record restricted interiors, or capture occupants where they reasonably expect privacy without valid permission. False authorization claims can lead to suspension.`,
      },
      {
        question: "How does the six-digit agent PIN handshake work?",
        answer: `When a qualifying real-estate bounty is posted, Onlooker generates a unique six-digit on-site PIN for that bounty. The PIN is stored securely and sent to the supplied listing-agent phone number or email. The agent gives it directly to the onlooker at the property. The onlooker enters it in the check-in screen to prove an on-site handshake.`,
      },
      {
        question: "When is a real-estate payout unlocked?",
        answer: `A real-estate submission cannot enter the payout flow until its secure on-site PIN has been validated. A successful match records the verification time and marks the bounty Verified On-Site. The normal fulfillment review still applies afterward. Repeated invalid attempts are rate-limited to protect the agent, property, and escrow.`,
      },
      {
        question: "Why does the form request agent contact information?",
        answer: `The listing-agent name helps identify the authorized contact. At least one valid delivery channel—an SMS-capable phone number or email—is required so the private PIN can be delivered without public exposure or manual sharing by the poster. Contact details are used for this verification workflow and handled according to the Privacy Policy.`,
      },
    ],
  },
  {
    id: "account",
    label: "Account, Safety & Compliance",
    shortLabel: "Account & Safety",
    description: "Accounts, trust, disputes, privacy, Terms, and copyright.",
    icon: ShieldCheck,
    questions: [
      {
        question: "How do trust levels and reputation work?",
        answer: `New members start at Level 1 Reader / Flagger. Helpful actions—such as completing the safety tutorial, responsibly finishing bounties, validating eligible updates, and flagging outdated content—can build reputation. Level 2 Provisional Contributors gain additional community-validation abilities. Level 3 Verified Creators / First Responders must meet enhanced verification and trust requirements before high-impact reporting tools unlock.`,
      },
      {
        question: "How do I file a dispute or report unsafe behavior?",
        answer: `Use the Dispute Center during the applicable bounty review window to select the request, choose a reason, describe what happened, and attach supporting evidence. Filing an eligible dispute holds escrow for moderator review. Unsafe content, abuse, fraud, or false reporting should also be flagged through the relevant content or safety controls. Do not use disputes to pressure another member or avoid a valid payment.`,
      },
      {
        question: "What happens to my account data and how can I delete it?",
        answer: `You can update your profile information and photo from Profile. The Privacy Policy explains how Onlooker handles account information, precise location, media, transactions, and safety records. Account deletion is available in Profile settings and requires typing DELETE to confirm permanent data loss. Some records may be retained when legally required or necessary for fraud, disputes, and platform safety.`,
      },
      {
        question: "What legal policies apply to using Onlooker?",
        answer: `Use of the platform is governed by the Terms of Service and Privacy Policy, including lawful recording, location use, content rights, risk, prohibited conduct, payment rules, and enforcement. Onlooker respects intellectual-property rights and maintains a DMCA and Copyright Infringement Policy for takedown notices and counter-notifications. Users may not rebroadcast protected streams, tickets, barcodes, or third-party digital interfaces.`,
      },
      {
        question: "Where can I read the complete legal terms?",
        answer: `The Help Center summarizes common workflows and does not replace the controlling policies. Review the linked Terms of Service, Privacy Policy, and DMCA & Copyright Infringement Policy below for full details. Contact support when you need help applying a policy to a specific situation.`,
      },
    ],
  },
];

function FAQScreen() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("bounties");
  const selected = CATEGORIES.find((category) => category.id === activeCategory);

  const tabsRef = useRef<HTMLElement>(null);
  const [tabsScroll, setTabsScroll] = useState({
    canLeft: false,
    canRight: false,
    thumbWidth: 100,
    thumbLeft: 0,
  });

  const updateTabsScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft < max - 1;
    const visibleRatio = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    const thumbWidth = Math.min(100, Math.max(14, visibleRatio * 100));
    const progress = max > 0 ? el.scrollLeft / max : 0;
    setTabsScroll({
      canLeft,
      canRight,
      thumbWidth,
      thumbLeft: progress * (100 - thumbWidth),
    });
  }, []);

  useEffect(() => {
    updateTabsScroll();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateTabsScroll, { passive: true });
    const ro = new ResizeObserver(updateTabsScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateTabsScroll);
      ro.disconnect();
    };
  }, [updateTabsScroll]);

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  };

  if (!selected) return null;

  return (
    <main className="reading-shell pb-28 pt-[max(env(safe-area-inset-top),3rem)]">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-signal text-signal-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--signal)_22%,transparent)] animate-red-flash motion-reduce:animate-none">
            <HelpCircle className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-signal">Onlooker</p>
            <h1 className="font-display text-2xl text-foreground">Help <span className="text-signal">Center</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">Clear answers for every part of the platform.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Close Help Center"
          onClick={close}
          className="size-11 shrink-0 rounded-full border border-border bg-secondary/80 shadow-sm"
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <div className="relative">
        {tabsScroll.canLeft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/80 to-transparent"
          />
        )}
        {tabsScroll.canRight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background via-background/80 to-transparent"
          />
        )}
        <nav
          ref={tabsRef}
          aria-label="Help categories"
          className="-mx-1 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max gap-2" role="tablist" aria-label="Help categories">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const active = category.id === activeCategory;
              return (
                <Button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="faq-category-panel"
                  variant={active ? "default" : "secondary"}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "h-11 gap-2 rounded-full border-2 border-signal px-4 text-sm",
                    "animate-red-flash motion-reduce:animate-none",
                    active
                      ? "bg-signal text-signal-foreground"
                      : "bg-surface text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="sm:hidden">{category.shortLabel}</span>
                  <span className="hidden sm:inline">{category.label}</span>
                </Button>
              );
            })}
          </div>
        </nav>
      </div>
      {(tabsScroll.canLeft || tabsScroll.canRight) && (
        <div
          aria-hidden="true"
          className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-border/50"
        >
          <div
            className="h-full rounded-full bg-signal shadow-[0_0_8px_color-mix(in_oklab,var(--signal)_55%,transparent)]"
            style={{
              width: `${tabsScroll.thumbWidth}%`,
              marginLeft: `${tabsScroll.thumbLeft}%`,
            }}
          />
        </div>
      )}

      <section
        id="faq-category-panel"
        role="tabpanel"
        aria-label={selected.label}
        className="mt-3"
      >
        <div className="mb-4 border-l-2 border-signal pl-4">
          <h2 className="font-display text-xl text-foreground">{selected.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
        </div>

        <Accordion key={selected.id} type="single" collapsible className="space-y-3">
          {selected.questions.map(({ question, answer }, index) => (
            <AccordionItem
              key={question}
              value={`${selected.id}-${index}`}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <AccordionTrigger className="min-h-14 px-4 py-4 text-left text-sm font-semibold text-foreground hover:bg-surface-raised hover:no-underline">
                <span className="pr-4">{question}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-5 pt-1">
                <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <aside className="mt-8 border-t border-border pt-6">
        <h2 className="font-display text-lg text-foreground">Still need help?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <Link to="/contact" className="font-semibold text-signal underline underline-offset-4">Contact support</Link>
          {" or read the complete "}
          <Link to="/terms" className="font-semibold text-foreground underline underline-offset-4">Terms of Service</Link>
          {", "}
          <Link to="/privacy" className="font-semibold text-foreground underline underline-offset-4">Privacy Policy</Link>
          {", and "}
          <Link to="/copyright" className="font-semibold text-foreground underline underline-offset-4">DMCA &amp; Copyright Policy</Link>.
        </p>
      </aside>
    </main>
  );
}