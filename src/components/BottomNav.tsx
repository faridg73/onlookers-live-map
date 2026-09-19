// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map, Radio, Plus, UserRound, Compass, MessageCircle, Users, Wallet } from "lucide-react";
import { useChatAlerts } from "@/hooks/use-chat-alerts";
import { ChatInbox } from "@/components/ChatInbox";
import { FlashBountyButton } from "@/components/FlashBountyButton";

const items = [
  { to: "/", label: "Home", icon: Map, exact: true },
  { to: "/community", label: "Discover", icon: Compass, exact: false },
  { to: "/discover", label: "Venues", icon: Users, exact: false },
  { to: "/hunt", label: "Earn", icon: Radio, exact: false },
  { to: "/post", label: "+ Post", icon: Plus, exact: false, primary: true },
  { to: "/balance", label: "Balance", icon: Wallet, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const linkClass =
  "group flex h-full w-full min-w-0 flex-col items-center justify-start gap-1 py-3 text-center text-[0.55rem] font-medium leading-tight text-muted-foreground transition-colors data-[status=active]:text-signal";

export function BottomNav() {
  const { unread } = useChatAlerts();
  const [inboxOpen, setInboxOpen] = useState(false);

  return (
    <>
      <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/85 pb-safe backdrop-blur-xl">
        <ul className="mx-auto flex w-full max-w-7xl items-stretch justify-between gap-0.5 px-0.5 pt-1 sm:px-4 lg:px-8">
          {items.map(({ to, label, icon: Icon, exact, ...item }) => (
            <Fragment key={to}>
              {to === "/post" && (
                <li className="min-w-0 flex-1">
                  <FlashBountyButton variant="nav" />
                </li>
              )}
              <li className="min-w-0 flex-1">
                <Link
                  to={to}
                  activeOptions={{ exact }}
                  className={`${linkClass} ${"primary" in item ? "font-extrabold text-signal" : ""}`}
                >
                  <span
                    className={`relative grid size-8 place-items-center rounded-full ${
                      "primary" in item ? "bg-signal text-signal-foreground" : ""
                    }`}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="w-full truncate">{label}</span>
                </Link>
              </li>
            </Fragment>
          ))}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              aria-label={unread > 0 ? `Live Inbox, ${unread} unread messages` : "Live Inbox"}
              className={`${linkClass} w-full ${inboxOpen ? "text-signal" : ""}`}
            >
              <span className="relative grid size-8 place-items-center rounded-full">
                <MessageCircle className="size-5" strokeWidth={1.75} />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] font-extrabold leading-4 text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className="w-full leading-tight">Live Inbox</span>
            </button>
          </li>
        </ul>
      </nav>

      <ChatInbox open={inboxOpen} onOpenChange={setInboxOpen} />
    </>
  );
}
