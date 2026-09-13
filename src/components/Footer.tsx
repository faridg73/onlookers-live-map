import { Link } from "@tanstack/react-router";
import { MessageSquare, Gavel, HelpCircle, FileText, Shield, ShieldAlert } from "lucide-react";

const LINKS = [
  { to: "/faq", label: "FAQ", icon: HelpCircle },
  { to: "/contact", label: "Contact", icon: MessageSquare },
  { to: "/disputes", label: "Disputes", icon: Gavel },
  { to: "/terms", label: "Terms", icon: FileText },
  { to: "/privacy", label: "Privacy", icon: Shield },
  { to: "/dmca", label: "DMCA / Report Infringement", icon: ShieldAlert },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-8">
      <div className="mx-auto max-w-lg">
        <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        </nav>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Onlooker. All rights reserved.
          </p>
          <a
            href="mailto:support@onlooker.app"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            support@onlooker.app
          </a>
        </div>
      </div>
    </footer>
  );
}
