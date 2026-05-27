import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, SprayCan, ShoppingCart, Users, BookOpen, LogOut, Sparkles, Menu, Plus, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";

const nav = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/perfumes", label: "Produtos", icon: SprayCan },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/catalogo", label: "Catálogo", icon: BookOpen },
] as const;

// Bottom nav mobile: 5 itens principais
const bottomNav = [nav[0], nav[1], nav[2], nav[3], nav[5]] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
      <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <div className="font-serif text-lg leading-tight">Gestor</div>
        <div className="text-xs text-muted-foreground -mt-0.5">de Perfumes</div>
      </div>
    </div>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileFab() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Context-aware target
  const target =
    pathname.startsWith("/clientes") ? "/clientes" :
    pathname.startsWith("/perfumes") ? "/perfumes" :
    "/vendas/nova";
  const label =
    target === "/clientes" ? "Novo cliente" :
    target === "/perfumes" ? "Novo produto" :
    "Nova venda";
  return (
    <button
      aria-label={label}
      onClick={() => {
        if (target === "/vendas/nova") navigate({ to: "/vendas/nova" });
        else if (target === "/clientes") navigate({ to: "/clientes" });
        else navigate({ to: "/perfumes" });
      }}
      className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-sidebar border-r border-sidebar-border shrink-0">
        <Brand />
        <div className="flex-1">
          <NavLinks />
        </div>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground px-3 pb-2 truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg">Gestor</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Brand />
              <NavLinks onNavigate={() => setOpen(false)} />
              <div className="p-3 border-t border-sidebar-border">
                <div className="text-xs text-muted-foreground px-3 pb-2 truncate">{user?.email}</div>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
          <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
            {children}
          </div>
        </main>

        <MobileFab />
        <MobileBottomNav />
      </div>
    </div>
  );
}
