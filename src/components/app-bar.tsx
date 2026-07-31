import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useNotifications, useProfile } from "@/lib/data";

/**
 * Top app bar: greeting on the left, notifications + profile avatar on the right.
 * The avatar replaces the old bottom-nav profile destination.
 */
export function AppBar({
  greeting,
  name,
  subtitle,
}: {
  greeting: string;
  name?: string;
  subtitle?: string;
}) {
  const { data: profile } = useProfile();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;
  const initials = (profile?.full_name ?? "F").slice(0, 1).toUpperCase();

  return (
    <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        {subtitle && <p className="truncate text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{subtitle}</p>}
        <h1 className="mt-0.5 text-[26px] font-bold leading-tight tracking-[-0.03em]">
          <span className="block">{greeting}</span>
          {name && <span className="block truncate">{name}</span>}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="press relative flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/60 text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link to="/profile" aria-label="Profile, analytics and settings" className="press">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? "Profile"}
              className="h-11 w-11 rounded-2xl object-cover"
            />
          ) : (
            <span className="gradient-hero flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-primary-foreground">
              {initials}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
