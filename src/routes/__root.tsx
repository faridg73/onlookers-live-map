// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { OnlookerProvider } from "@/lib/onlooker-store";
import { BoostProvider } from "@/lib/boosts-store";
import { BottomNav } from "../components/BottomNav";
import { AppMenu } from "../components/AppMenu";
import { Footer } from "../components/Footer";
import { Toaster } from "../components/ui/sonner";
import { ProfileSetup } from "../components/ProfileSetup";
import { OnboardingWalkthrough } from "../components/OnboardingWalkthrough";
import { AuthProvider } from "@/hooks/use-auth";
import { useSessionScroll } from "@/hooks/use-session-scroll";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Onlooker, Live views from people already there" },
      {
        name: "description",
        content: "Post a bounty and get a live photo of any place from someone standing there now.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0A0A0A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Onlooker" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Big+Shoulders+Display:ital,wght@1,800;1,900&family=DM+Sans:wght@400;500;600;700&family=Hind:wght@400;500;600;700&family=Inter:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.png?v=20260916", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-180.png?v=20260916" },
      { rel: "manifest", href: "/manifest.webmanifest?v=20260916" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Embed pages run inside someone else's article: no app navigation there.
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const embedded = pathname.startsWith("/embed");
  useSessionScroll(`onlooker:scroll:route:${location.href}`);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnlookerProvider>
          <BoostProvider>
            {/* The footer follows the page naturally; the non-Home nav is also in document flow. */}
            <div className="flex flex-col bg-background text-foreground">
              {/* Route content sets its natural height so empty feeds do not create a black void. */}
              <main className="w-full">
                {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
                <Outlet />
              </main>
              {/* Home is a full-screen fixed map that would cover the footer, so mount it only on scrollable pages. */}
              {!embedded && pathname !== "/" && (
                <Footer showLinks={pathname.startsWith("/profile")} />
              )}
            </div>
            {/* Only Home's navigation floats; every other page's navigation stays in document flow. */}
            {!embedded && (
              <>
                {pathname.startsWith("/profile") && <AppMenu />}
                <BottomNav />
                <ProfileSetup />
                <OnboardingWalkthrough />
              </>
            )}
            <Toaster position="top-center" />
          </BoostProvider>
        </OnlookerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

