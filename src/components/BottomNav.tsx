import { Link } from "@tanstack/react-router";
import { Map, Radio, Plus, UserRound } from "lucide-react";

const items = [
  { to: "/", label: "Map", icon: Map, exact: true },
  { to: "/hunt", label: "Earn", icon: Radio, exact: false },
  { to: "/post", label: "Post", icon: Plus, exact: false, primary: true },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const linkClass =
  "group flex flex-col items-center gap-1 py-4 text-[0.58rem] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors data-[status=active]:text-signal";

export function BottomNav() {
  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/90 pb-safe backdrop-blur-xl">
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-3 pt-1">
        {items.map(({ to, label, icon: Icon, exact, ...item }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              activeOptions={{ exact }}
              className={`${linkClass} ${"primary" in item ? "font-extrabold text-signal" : ""}`}
            >
              <span className={`relative ${"primary" in item ? "grid size-9 place-items-center rounded-xl bg-signal text-signal-foreground shadow-lg" : ""}`}>
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
