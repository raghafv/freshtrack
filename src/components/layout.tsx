import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Home, Refrigerator, ScanLine, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/scanner", label: "Scan", icon: ScanLine },
  { to: "/assistant", label: "AI", icon: Sparkles },
] as const;

export function BottomNav({ unread: _unread = 0 }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="nav-surface fixed inset-x-0 bottom-0 z-40 safe-bottom">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-1 py-1.5">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "press relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium tracking-tight transition-colors",
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
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl animate-fade-up px-5 pb-32 pt-7">{children}</div>;
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
