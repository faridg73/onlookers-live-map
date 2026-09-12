import { Link } from "@tanstack/react-router";
import { Map, Radio, PlusSquare, UserRound, Compass, HelpCircle } from "lucide-react";
import { useChatAlerts } from "@/hooks/use-chat-alerts";

const items = [
  { to: "/", label: "Map", icon: Map, exact: true },
  { to: "/feed", label: "Feed", icon: Radio, exact: false },
  { to: "/explore", label: "Explore", icon: Compass, exact: false },
  { to: "/post", label: "Post", icon: PlusSquare, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
  { to: "/faq", label: "FAQ", icon: HelpCircle, exact: false },
] as const;

export function BottomNav() {
  const { unread } = useChatAlerts();

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact }}
              className="group flex flex-col items-center gap-1 py-3 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors data-[status=active]:text-signal"
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
