import { friendlyMessage } from "@/lib/errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Palette, Ruler, ShieldAlert, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageContainer } from "@/components/layout";
import { PushSettingsRow } from "@/components/push-prompt";

import { useSettings, useUpdateSettings } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { deleteAccount } from "@/lib/account.functions";
import { STORAGE_TYPES, UNITS } from "@/lib/freshtrack";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Theme, Reminders & Units | FreshTrack" },
      {
        name: "description",
        content:
          "Control FreshTrack appearance, expiry reminder timing, default storage and units, and manage your account.",
      },
      { property: "og:title", content: "FreshTrack Settings" },
      {
        property: "og:description",
        content: "Theme, reminders, storage defaults, units and account controls.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { signOut } = useAuth();
  const removeAccount = useServerFn(deleteAccount);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await removeAccount({ data: undefined });
      await signOut();
      toast.success("Account deleted");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(friendlyMessage(e, "Could not delete account"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageContainer>
      <div className="mb-5 flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-xl"
          aria-label="Back to profile"
          onClick={() => navigate({ to: "/profile" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">Settings</h1>
      </div>

      <Section icon={Bell} title="Notifications">
        <div className="flex items-center justify-between">
          <Label htmlFor="notif" className="text-sm">
            Notifications
          </Label>
          <Switch
            id="notif"
            checked={settings?.notifications_enabled ?? true}
            onCheckedChange={(v) => update.mutate({ notifications_enabled: v })}
          />
        </div>

        <div className="mt-4 grid gap-3 border-t border-border/60 pt-4">
          {(
            [
              { key: "notify_expiry", label: "Expiring soon" },
              { key: "notify_expired", label: "Already expired" },
              { key: "notify_low_stock", label: "Running low" },
              { key: "notify_recipe", label: "Daily recipe idea" },
            ] as const
          ).map((row) => (
            <div key={row.key} className="flex items-center justify-between">
              <Label htmlFor={row.key} className="text-sm font-normal text-muted-foreground">
                {row.label}
              </Label>
              <Switch
                id={row.key}
                disabled={settings?.notifications_enabled === false}
                checked={settings?.[row.key] ?? true}
                onCheckedChange={(v) => update.mutate({ [row.key]: v })}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          <Label className="text-sm">Remind me before expiry</Label>
          <Select
            value={String(settings?.expiry_reminder_days ?? 3)}
            onValueChange={(v) => update.mutate({ expiry_reminder_days: Number(v) })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 5, 7].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} day{d === 1 ? "" : "s"} before
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-5 border-t border-border/60 pt-4">
          <PushSettingsRow />
        </div>
      </Section>


      <Section icon={Ruler} title="Storage & units">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-sm">Default storage</Label>
            <Select
              value={settings?.default_storage ?? "Fridge"}
              onValueChange={(v) => update.mutate({ default_storage: v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-sm">Default unit</Label>
            <Select
              value={settings?.default_unit ?? "pcs"}
              onValueChange={(v) => update.mutate({ default_unit: v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section icon={ShieldAlert} title="Danger zone">
        <p className="mb-3 text-sm text-muted-foreground">
          Deleting your account permanently removes your pantry, shopping list, notifications and
          scan history.
        </p>
        <Button
          variant="destructive"
          className="press w-full rounded-2xl"
          onClick={() => setConfirmOpen(true)}
        >
          Delete account
        </Button>
      </Section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your FreshTrack account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All of your pantry data will be erased immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Palette;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card mb-4 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
