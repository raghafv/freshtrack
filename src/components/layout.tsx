import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChefHat, Home, Plus, Refrigerator, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AddSheet } from "@/components/add-sheet";
import { cn } from "@/lib/utils";

const LEFT = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
] as const;

const RIGHT = [
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/assistant", label: "Assistant", icon: Sparkles },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  pathname,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  pathname: string;
}) {
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "press flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium tracking-[-0.01em] transition-colors duration-300",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.7} />
      {label}
    </Link>
  );
}

export function BottomNav({ unread: _unread = 0 }: { unread?: number }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <nav className="nav-surface fixed inset-x-0 bottom-0 z-40 safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-2.5">
          {LEFT.map((n) => (
            <NavLink key={n.to} {...n} pathname={pathname} />
          ))}

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              aria-label="Add to pantry"
              onClick={() => setAddOpen(true)}
              className="add-fab press flex h-[62px] w-[62px] items-center justify-center rounded-full text-primary-foreground"
            >
              <Plus className="h-8 w-8" strokeWidth={3.25} />
            </button>

          </div>

          {RIGHT.map((n) => (
            <NavLink key={n.to} {...n} pathname={pathname} />
          ))}
          
        </div>
      </nav>

      <AddSheet open={addOpen} onOpenChange={setAddOpen} />
    </>
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
    <header className="mb-7 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-up px-6 pb-40 pt-9">{children}</div>
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
    <div className="surface-card animate-pop flex flex-col items-center gap-3.5 px-7 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-7 w-7" strokeWidth={1.7} />
      </span>
      <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="max-w-xs text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
