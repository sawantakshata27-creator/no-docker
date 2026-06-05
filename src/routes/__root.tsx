import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { useAuth } from "@/lib/auth-store";
import { initTheme, useTheme } from "@/lib/theme-store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card-surface max-w-md p-10 text-center">
        <h1 className="text-7xl font-bold text-primary-600">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-flex">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card-surface max-w-md p-10 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="btn-primary mt-6"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1e4eda" },
      { title: "2DS Workflow — Document workflow. Chaos eliminated." },
      { name: "description", content: "Kanban-powered document workflow OS. Move work through Create → QA → Deliver with real-time analytics, role-based controls, and a board your team learns in five minutes." },
      { name: "robots", content: "index,follow" },
      { name: "author", content: "2DS Workflow" },

      // Open Graph
      { property: "og:site_name", content: "2DS Workflow" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "2DS Workflow — Document workflow. Chaos eliminated." },
      { property: "og:description", content: "Kanban-powered document workflow OS with real-time analytics and team controls." },
      { property: "og:image", content: "/2ds-workflow-logo.png" },
      { property: "og:image:alt", content: "2DS Workflow logo" },

      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "2DS Workflow — Document workflow. Chaos eliminated." },
      { name: "twitter:description", content: "Kanban-powered document workflow OS with real-time analytics and team controls." },
      { name: "twitter:image", content: "/2ds-workflow-logo.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/2ds-workflow-logo.png" },
      { rel: "apple-touch-icon", href: "/2ds-workflow-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Geist:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=Archivo+Black&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const init = useAuth((s) => s.init);
  const dark = useTheme((s) => s.dark);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => { init(); }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
