import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Leaf, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/layout";
import { PushPrompt } from "@/components/push-prompt";
import { useAuth } from "@/lib/auth";
import { useNotifications, useSettings } from "@/lib/data";
import { useTheme } from "@/lib/theme";


export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <span className="gradient-hero flex h-14 w-14 items-center justify-center rounded-2xl text-primary-foreground">
          <Leaf className="h-7 w-7" />
        </span>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthedShell />;
}

const CHAT_SESSION_KEY = "freshtrack.chat.session";

function AuthedShell() {
  const { data: notifications } = useNotifications();
  const { data: settings } = useSettings();
  const { setTheme, theme } = useTheme();
  const clearChat = useClearAssistant();

  // Keep the saved theme preference in sync with the device on first load.
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) setTheme(settings.theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.theme]);

  // The AI chat is a per-visit conversation: wipe it once whenever FreshTrack
  // is opened fresh. Generated shopping lists and recipes are stored separately
  // and stay on the home screen.
  useEffect(() => {
    if (sessionStorage.getItem(CHAT_SESSION_KEY) === "1") return;
    sessionStorage.setItem(CHAT_SESSION_KEY, "1");
    clearChat.mutate(undefined, { onError: () => undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
      <PushPrompt />
      <BottomNav unread={unread} />
    </div>
  );
}
