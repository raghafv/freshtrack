import { useState } from "react";
import { toast } from "sonner";
import { Copy, Inbox, Loader2, Mail, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteSupportTicket } from "@/lib/admin.functions";
import { deleteFeedback } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { friendlyMessage } from "@/lib/errors";
import { useAllTickets, useUpdateTicket, type SupportTicket } from "@/lib/support";

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [reply, setReply] = useState(ticket.admin_reply ?? "");
  const [open, setOpen] = useState(false);
  const update = useUpdateTicket();
  const qc = useQueryClient();
  const del = useServerFn(deleteSupportTicket);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this ticket forever? It can't be recovered.")) return;
    setDeleting(true);
    try {
      await del({ data: { id: ticket.id } });
      deleteFeedback();
      toast.success("Ticket deleted");
      await qc.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (e) {
      toast.error(friendlyMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  async function save(status?: string) {
    try {
      await update.mutateAsync({ id: ticket.id, status, admin_reply: reply.trim() || undefined });
      toast.success(status === "resolved" ? "Marked resolved" : "Reply saved");
    } catch (e) {
      toast.error(friendlyMessage(e));
    }
  }

  return (
    <div className="rounded-2xl bg-muted/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          title="Copy email"
          onClick={() => {
            if (!ticket.user_email) return;
            void navigator.clipboard?.writeText(ticket.user_email);
            toast.success("Email copied");
          }}
          className="flex min-w-0 items-center gap-1.5 text-left text-sm font-semibold"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{ticket.user_email ?? `User ${ticket.user_id.slice(0, 8)}`}</span>
          {ticket.user_email ? <Copy className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
        </button>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ticket.status}</span>
          <button
            type="button"
            aria-label="Delete ticket"
            disabled={deleting}
            onClick={remove}
            className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {ticket.category} · {new Date(ticket.created_at).toLocaleString()}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{ticket.message}</p>

      {ticket.image_urls.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {ticket.image_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt="Attachment" className="h-24 w-24 rounded-xl object-cover" />
            </a>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply the user will see in the app"
            className="min-h-20 rounded-2xl"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              disabled={update.isPending}
              onClick={() => save()}
            >
              {update.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              Send reply
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl"
              onClick={() => save("resolved")}
            >
              Mark resolved
            </Button>
            {ticket.status === "resolved" ? (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => save("open")}
              >
                Reopen
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 rounded-xl"
          onClick={() => setOpen(true)}
        >
          {ticket.admin_reply ? "Edit reply" : "Reply"}
        </Button>
      )}
    </div>
  );
}

/** Admin-only list of every support message sent from inside the app. */
export function SupportInbox() {
  const { data, isLoading } = useAllTickets();
  const [showResolved, setShowResolved] = useState(false);
  const tickets = (data ?? []).filter((t) => showResolved || t.status !== "resolved");
  const openCount = (data ?? []).filter((t) => t.status !== "resolved").length;

  return (
    <section className="surface-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Inbox className="h-4 w-4 text-primary" /> Support inbox
          {openCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
              {openCount}
            </span>
          ) : null}
        </h2>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-xl"
          onClick={() => setShowResolved((v) => !v)}
        >
          {showResolved ? "Hide resolved" : "Show resolved"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No support messages yet.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}
    </section>
  );
}
