import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChefHat,
  LayoutDashboard,
  Refrigerator,
  ScanLine,
  ShoppingCart,
  Sparkles,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/scanner", label: "Scan", icon: ScanLine },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/assistant", label: "Ask", icon: Sparkles },
  { to: "/shopping", label: "List", icon: ShoppingCart },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 safe-bottom rounded-t-3xl">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1 py-1.5">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "press relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-full max-w-12 items-center justify-center rounded-full transition-all duration-300",
                    active ? "bg-primary-soft" : "bg-transparent",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 1.8} />
                  {to === "/notifications" && unread > 0 && (
                    <span className="absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-up px-4 pb-28 pt-6">{children}</div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card animate-pop flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
