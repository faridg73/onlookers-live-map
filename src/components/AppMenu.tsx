// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CircleDollarSign,
  HelpCircle,
  LifeBuoy,
  Menu,
  MessageCircle,
  Radio,
  Scale,
  Trophy,
  Users,
  Wallet,
  Receipt,
  X,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ChatInbox } from "@/components/ChatInbox";
import { FlashBountyButton } from "@/components/FlashBountyButton";
import { useChatAlerts } from "@/hooks/use-chat-alerts";

/** Everything that is not one of the five core tabs still lives one tap away. */
const LINKS = [
  { to: "/discover", label: "Venues & Events", note: "Browse real places and what's on", icon: Users },
  { to: "/balance", label: "Balance & Cashout", note: "Credits, top-ups and payouts", icon: Wallet },
  { to: "/payout-history", label: "Payout history", note: "Every cash-out you've made", icon: Receipt },
  { to: "/feed", label: "Live requests", note: "Open bounties on the board", icon: Radio },
  { to: "/pools", label: "Group pools", note: "Chip in on a shared bounty", icon: CircleDollarSign },
  { to: "/leaderboard", label: "Top reporters", note: "This week's best onlookers", icon: Trophy },
  { to: "/disputes", label: "Dispute center", note: "Open or follow a dispute", icon: Scale },
  { to: "/faq", label: "Help center", note: "How everything works", icon: HelpCircle },
  { to: "/contact", label: "Contact & support", note: "Send our team a message", icon: LifeBuoy },
] as const;

/**
 * Header menu for the secondary views the bottom bar no longer carries.
 * Nothing was removed, it all opens from here.
 */
export function AppMenu() {
  const { unread } = useChatAlerts();
  const [open, setOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  // Home's logo card owns the top-right corner, so the launcher tucks under it.
  const onHome = useRouterState({ select: (state) => state.location.pathname === "/" });
  // Current path so the drawer highlights the page you're on when reopened.
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `More, ${unread} unread messages` : "More"}
        className={`fixed z-[70] grid size-9 place-items-center rounded-full border border-signal/60 bg-surface/90 text-signal shadow-md shadow-signal/20 backdrop-blur-xl transition-colors hover:border-signal hover:brightness-110 ${
          open ? "hidden" : ""
        } ${
          onHome
            ? "right-3 top-[calc(env(safe-area-inset-top)+6.75rem)] md:right-4"
            : "right-14 top-[calc(env(safe-area-inset-top)+0.75rem)]"
        }`}
      >
        <Menu className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] font-extrabold leading-4 text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-[19rem] flex-col gap-0 overflow-y-auto border-border bg-surface p-0 sm:w-[21rem]"
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <SheetTitle className="text-base font-extrabold text-foreground">
              Everything <span className="text-signal">else</span>
            </SheetTitle>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid size-9 place-items-center rounded-full border border-border bg-secondary/80 text-muted-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setInboxOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-signal/60 bg-signal/10 p-3 text-left"
            >
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
                <MessageCircle className="size-4" aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-1.5 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] font-extrabold leading-4 text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-foreground">Live Inbox</span>
                <span className="block text-xs font-semibold text-signal">
                  {unread > 0 ? `${unread} unread` : "Your bounty and stream chats"}
                </span>
              </span>
            </button>
          </div>

          <div className="px-5 pb-4">
            <p className="mb-2 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              Flash bounty
            </p>
            <FlashBountyButton variant="crisis" />
          </div>

          <nav className="flex-1 space-y-2 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {LINKS.map(({ to, label, note, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-raised p-3 transition-colors hover:border-signal/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-signal/40 text-signal">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-foreground">{label}</span>
                  <span className="block text-xs font-semibold text-signal">{note}</span>
                </span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <ChatInbox open={inboxOpen} onOpenChange={setInboxOpen} />
    </>
  );
}
