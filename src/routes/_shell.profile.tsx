import { friendlyMessage } from "@/lib/errors";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  LogOut,
  Package,
  Pencil,
  Settings as SettingsIcon,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth";
import {
  useActivity,
  usePantryItems,
  useProfile,
  useScanHistory,
  useSettings,
  useUpdateProfile,
} from "@/lib/data";
import { computeStats } from "@/lib/freshtrack";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Stats — FreshTrack" },
      {
        name: "description",
        content:
          "Your FreshTrack profile: lifetime pantry statistics, appearance preferences and account controls.",
      },
      { property: "og:title", content: "FreshTrack Profile" },
      {
        property: "og:description",
        content: "Pantry statistics, theme preference and account controls.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: items = [] } = usePantryItems();
  const { data: activity = [] } = useActivity(100);
  const { data: scans = [] } = useScanHistory();
  const { data: settings } = useSettings();
  const updateProfile = useUpdateProfile();
  const checkAdmin = useServerFn(amIAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin({}),
    staleTime: 5 * 60_000,
  });
  const isAdmin = adminCheck?.admin === true;

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  const stats = computeStats(items, settings?.expiry_reminder_days ?? 3);
  const addedTotal = activity.filter((a) => a.action === "added").length;
  const initials = (profile?.full_name ?? user?.email ?? "F").slice(0, 1).toUpperCase();

  async function saveName() {
    try {
      await updateProfile.mutateAsync({ full_name: name.trim().slice(0, 60) });
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not save"));
    }
  }

  return (
    <PageContainer>
      <PageHeader title="Profile" />

      <section className="surface-card mb-5 flex items-center gap-4 p-5">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? "Profile photo"}
            className="h-16 w-16 rounded-3xl object-cover"
          />
        ) : (
          <span className="gradient-hero flex h-16 w-16 items-center justify-center rounded-3xl text-2xl font-bold text-primary-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <Input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl"
              />
              <Button className="h-10 rounded-xl" onClick={saveName}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <p className="truncate text-lg font-bold">
                {profile?.full_name ?? "FreshTrack user"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </>
          )}
        </div>
        {!editing && (
          <Button
            size="icon"
            variant="ghost"
            className="rounded-xl"
            aria-label="Edit name"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3">
        <StatBox icon={Package} label="Items in pantry" value={String(stats.total)} />
        <StatBox icon={TrendingUp} label="Pantry health" value={`${stats.healthScore}%`} />
        <StatBox icon={Package} label="Items ever added" value={String(addedTotal)} />
        <StatBox icon={TrendingUp} label="Scans completed" value={String(scans.length)} />
      </section>


      <Link
        to="/analytics"
        className="surface-card press mb-3 flex items-center justify-between p-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Analytics</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <Link
        to="/settings"
        className="surface-card press mb-3 flex items-center justify-between p-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <SettingsIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Settings</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      {isAdmin ? (
        <Link to="/admin" className="surface-card press mb-3 flex items-center justify-between p-4">
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Admin dashboard</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ) : null}



      <Button
        variant="secondary"
        className="press h-12 w-full rounded-2xl text-destructive"
        onClick={async () => {
          await signOut();
          navigate({ to: "/auth", replace: true });
        }}
      >
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </PageContainer>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card p-4">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
