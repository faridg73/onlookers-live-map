// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Radio, Plus, UserRound, Compass } from "lucide-react";

/** Five core tabs only. Everything else lives in the header menu (AppMenu). */
const items = [
  { to: "/", label: "Home", icon: Map, exact: true },
  { to: "/events", label: "Discover", icon: Compass, exact: false },
  { to: "/post", label: "+ Post", icon: Plus, exact: false, primary: true },
  { to: "/hunt", label: "Earn", icon: Radio, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

const linkClass =
  "group flex h-full w-full min-w-0 flex-col items-center justify-start gap-1 py-3 text-center text-[0.68rem] font-semibold leading-tight text-muted-foreground transition-colors data-[status=active]:text-signal";

export function BottomNav() {
  const isHome = useRouterState({ select: (state) => state.location.pathname === "/" });
  return (
    <nav
      className={`pointer-events-auto z-40 border-t pb-safe backdrop-blur-2xl ${
        isHome
          ? "fixed inset-x-0 bottom-0 border-home-line bg-home-glass-strong shadow-2xl lg:inset-x-auto lg:bottom-5 lg:left-1/2 lg:-translate-x-1/2 lg:rounded-3xl lg:border lg:px-2 lg:pb-0 lg:shadow-[0_18px_50px_color-mix(in_oklab,var(--color-background)_70%,transparent)]"
          : "relative mt-8 w-full border-border/70 bg-surface/85"
      }`}
    >
      <ul className="mx-auto flex w-full max-w-3xl items-stretch justify-between gap-1 px-2 pt-1 sm:px-4 lg:w-auto lg:max-w-none lg:gap-3 lg:px-2 lg:pb-1">
        {items.map(({ to, label, icon: Icon, exact, ...item }) => (
          <li key={to} className="min-w-0 flex-1 lg:w-24 lg:flex-none">
            <Link
              to={to}
              activeOptions={{ exact }}
              className={`${linkClass} ${"primary" in item ? "font-extrabold text-signal" : ""}`}
            >
              <span
                className={`relative grid size-9 place-items-center rounded-full border transition-all ${
                  isHome
                    ? "border-home-line bg-home-glass text-foreground/70 shadow-lg group-data-[status=active]:border-home-accent/60 group-data-[status=active]:bg-home-accent/12 group-data-[status=active]:text-home-accent"
                    : "border-2 border-signal/70 shadow-[0_0_10px_rgba(204,255,0,0.25)] group-data-[status=active]:border-signal group-data-[status=active]:shadow-[0_0_14px_rgba(204,255,0,0.5)]"
                } ${
                  "primary" in item
                    ? isHome
                      ? "border-home-accent/50 text-home-accent"
                      : "border-signal bg-signal text-signal-foreground"
                    : ""
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
