import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map, Radio, Plus, UserRound, Compass, MessageCircle, Users, Wallet } from "lucide-react";
import { useChatAlerts } from "@/hooks/use-chat-alerts";
import { ChatInbox } from "@/components/ChatInbox";
import { FlashBountyButton } from "@/components/FlashBountyButton";

const items = [
  { to: "/", label: "Map", icon: Map, exact: true },
  { to: "/community", label: "Discover", icon: Compass, exact: false },
  { to: "/discover", label: "Venues", icon: Users, exact: false },
  { to: "/hunt", label: "Earn", icon: Radio, exact: false },
  { to: "/post", label: "+ Post", icon: Plus, exact: false, primary: true },
  { to: "/balance", label: "Balance", icon: Wallet, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const linkClass =
  "group flex flex-col items-center gap-1 py-4 text-[0.58rem] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors data-[status=active]:text-signal";

export function BottomNav() {
  const { unread } = useChatAlerts();
  const [inboxOpen, setInboxOpen] = useState(false);

  return (
    <>
      <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/85 backdrop-blur-xl">
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
          {items.map(({ to, label, icon: Icon, exact, ...item }) => (
            <Fragment key={to}>
              {to === "/post" && (
                <li className="flex-1">
                  <FlashBountyButton variant="nav" />
                </li>
              )}
              <li className="flex-1">
                <Link
                  to={to}
                  activeOptions={{ exact }}
                  className={`${linkClass} ${"primary" in item ? "font-extrabold text-signal" : ""}`}
                >
                  <span className={`relative ${"primary" in item ? "grid size-8 place-items-center rounded-full bg-signal text-signal-foreground" : ""}`}>
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  {label}
                </Link>
              </li>
            </Fragment>
          ))}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              aria-label={unread > 0 ? `Inbox, ${unread} unread messages` : "Inbox"}
              className={`${linkClass} w-full ${inboxOpen ? "text-signal" : ""}`}
            >
              <span className="relative">
                <MessageCircle className="size-5" strokeWidth={1.75} />
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.6rem] font-extrabold leading-4 text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              Chats
            </button>
          </li>
        </ul>
      </nav>

      <ChatInbox open={inboxOpen} onOpenChange={setInboxOpen} />
    </>
  );
}
