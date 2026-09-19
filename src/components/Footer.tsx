// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  Gavel,
  HelpCircle,
  FileText,
  Shield,
  ShieldAlert,
  Copyright,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DmcaReportModal } from "@/components/DmcaReportModal";

const LINKS = [
  { to: "/faq", label: "FAQ", icon: HelpCircle },
  { to: "/contact", label: "Contact", icon: MessageSquare },
  { to: "/disputes", label: "Disputes", icon: Gavel },
  { to: "/terms", label: "Terms", icon: FileText },
  { to: "/privacy", label: "Privacy", icon: Shield },
  { to: "/copyright", label: "Copyright Policy", icon: Copyright },
] as const;

const SOCIAL_LINKS = [
  {
    label: "X (Twitter)",
    href: "https://x.com/onlooker_live",
    icon: XIcon,
    brandClass:
      "text-white hover:bg-white hover:text-black hover:border-white",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/onlooker_live",
    icon: InstagramIcon,
    brandClass:
      "text-white hover:border-[#ff0050]/60 hover:shadow-[0_0_12px_rgba(255,0,80,0.35)]",
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@onlooker_live",
    icon: TikTokIcon,
    brandClass:
      "text-white hover:border-[#00f2ea]/60 hover:shadow-[0_0_12px_rgba(0,242,234,0.35)]",
  },
] as const;

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="url(#instagram-gradient)" strokeWidth="1.75" aria-hidden="true">
      <defs>
        <linearGradient id="instagram-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="35%" stopColor="#ff0050" />
          <stop offset="70%" stopColor="#833ab4" />
          <stop offset="100%" stopColor="#405de6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="tiktok-cyan" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f2ea" />
          <stop offset="100%" stopColor="#00f2ea" />
        </linearGradient>
        <linearGradient id="tiktok-magenta" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff0050" />
          <stop offset="100%" stopColor="#ff0050" />
        </linearGradient>
      </defs>
      <path fill="url(#tiktok-cyan)" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      <path fill="url(#tiktok-magenta)" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" transform="translate(0.6,0.6)" opacity="0.85" />
    </svg>
  );
}

export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map(({ label, href, icon: Icon, brandClass }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            "flex size-10 items-center justify-center rounded-full border border-border bg-surface-raised transition-colors",
            brandClass
          )}
        >
          <Icon className="size-5" />
        </a>
      ))}
    </div>
  );
}

export function Footer() {

  const [dmcaOpen, setDmcaOpen] = useState(false);

  return (
    <footer className="border-t border-border bg-surface px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
        <nav className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              <Icon className="size-4 text-signal" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setDmcaOpen(true)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            <ShieldAlert className="size-4 text-signal" />
            DMCA / Report Infringement
          </button>
        </nav>

        <SocialLinks className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start" />


        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Onlooker LLC. All rights reserved.
          </p>
          <p className="text-xs font-semibold tracking-wide text-signal">
            #OnlookerLive
          </p>
          <a
            href="mailto:support@onlookerlive.com"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            support@onlookerlive.com
          </a>
        </div>
      </div>

      <DmcaReportModal open={dmcaOpen} onOpenChange={setDmcaOpen} />
    </footer>
  );
}

