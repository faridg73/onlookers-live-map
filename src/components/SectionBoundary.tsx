// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Component, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Keeps one broken section from taking the whole page down. The rest of the
 * screen stays interactive and the person can retry just this part.
 */
export class SectionBoundary extends Component<
  { children: ReactNode; label?: string },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("Section failed to render", error);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-center">
        <p className="text-sm font-semibold text-foreground">
          {this.props.label ?? "This section"} couldn&apos;t load
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Everything else on this page still works.
        </p>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
        >
          <RefreshCw className="size-3.5" /> Try again
        </button>
      </div>
    );
  }
}

/** Route-level fallback that keeps navigation available instead of a dead page. */
export function RouteErrorPanel({ error, reset }: { error: Error; reset?: () => void }) {
  console.error(error);
  return (
    <div className="app-shell pb-32 pt-10">
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="font-display text-2xl text-foreground">Nothing to show right now</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          We couldn&apos;t finish loading this feed. Try again, or browse another part of the app.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => reset?.()}
            className="rounded-full bg-signal px-4 py-2 text-sm font-bold text-signal-foreground"
          >
            Try again
          </button>
          <a
            href="/discover"
            className="rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground"
          >
            Browse places
          </a>
        </div>
      </div>
    </div>
  );
}
