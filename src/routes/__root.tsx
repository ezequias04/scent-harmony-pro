import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { LoginScreen } from "@/components/LoginScreen";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

const PUBLIC_PREFIXES = ["/c/", "/catalogo/", "/pedido/"];

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Golden Essence — Luxury Perfumes & Timeless Beauty" },
      { name: "description", content: "Golden Essence — perfumaria de luxo com inspiração árabe e elegância inglesa. Gestão de catálogo, vendas, estoque e clientes em uma experiência premium." },
      { name: "theme-color", content: "#C9A24D" },
      { property: "og:title", content: "Golden Essence — Luxury Perfumes & Timeless Beauty" },
      { name: "twitter:title", content: "Golden Essence — Luxury Perfumes & Timeless Beauty" },
      { property: "og:description", content: "Perfumaria de luxo com inspiração árabe e elegância inglesa." },
      { name: "twitter:description", content: "Perfumaria de luxo com inspiração árabe e elegância inglesa." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/adac6331-c3b4-43dd-b76b-df436444b1ad/id-preview-14bee7f8--a589e560-8195-4ec9-b96b-8afb0534eede.lovable.app-1779755187227.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/adac6331-c3b4-43dd-b76b-df436444b1ad/id-preview-14bee7f8--a589e560-8195-4ec9-b96b-8afb0534eede.lovable.app-1779755187227.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Golden Essence" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
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

function Gate() {
  const { loading, session } = useAuth();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        qc.invalidateQueries();
      }
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  if (isPublic) return <Outlet />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
