// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Map, Radio, Plus, UserRound, Compass } from "lucide-react";

/** Five core tabs only. Everything else lives in the header menu (AppMenu). */
const items = [
  { to: "/", label: "Home", icon: Map, exact: true },
  { to: "/community", label: "Discover", icon: Compass, exact: false },
  { to: "/post", label: "+ Post", icon: Plus, exact: false, primary: true },
  { to: "/hunt", label: "Earn", icon: Radio, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const linkClass =
  "group flex h-full w-full min-w-0 flex-col items-center justify-start gap-1 py-3 text-center text-[0.68rem] font-semibold leading-tight text-muted-foreground transition-colors data-[status=active]:text-signal";

export function BottomNav() {
  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-surface/85 pb-safe backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-between gap-1 px-2 pt-1 sm:px-4">
        {items.map(({ to, label, icon: Icon, exact, ...item }) => (
          <li key={to} className="min-w-0 flex-1">
            <Link
              to={to}
              activeOptions={{ exact }}
              className={`${linkClass} ${"primary" in item ? "font-extrabold text-signal" : ""}`}
            >
              <span
                className={`relative grid size-9 place-items-center rounded-full ${
                  "primary" in item ? "bg-signal text-signal-foreground" : ""
                }`}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="w-full truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
