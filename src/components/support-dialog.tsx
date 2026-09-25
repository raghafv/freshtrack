import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { friendlyMessage } from "@/lib/errors";
import { SUPPORT_CATEGORIES, useMyTickets, useSubmitTicket } from "@/lib/support";

const MAX_CHARS = 1200;

/** Sheet where a user writes to the FreshTrack team and attaches screenshots. */
export function SupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitTicket();
  const { data: tickets } = useMyTickets();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) {
      toast.error("Each image must be under 10 MB");
      return;
    }
    setFiles((prev) => [...prev, ...picked].slice(0, 3));
  }

  async function send() {
    if (message.trim().length < 10) {
      toast.error("Please describe the problem in a little more detail");
      return;
    }
    try {
      await submit.mutateAsync({ category, message, files });
      toast.success("Message sent — we'll get back to you here");
      setMessage("");
      setFiles([]);
      onOpenChange(false);
    } catch (e) {
      toast.error(friendlyMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message the team</DialogTitle>
          <DialogDescription>
            Tell us what went wrong. You can attach up to 3 screenshots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <Textarea
              value={message}
              maxLength={MAX_CHARS}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What happened? What were you trying to do?"
              className="min-h-32 rounded-2xl"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {message.length}/{MAX_CHARS}
            </p>
          </div>

          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="relative">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-1 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="press h-12 flex-1 rounded-2xl"
              disabled={files.length >= 3}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4" /> Add screenshot
            </Button>
            <Button
              type="button"
              className="press h-12 flex-1 rounded-2xl"
              disabled={submit.isPending}
              onClick={send}
            >
              {submit.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>

          {tickets && tickets.length > 0 ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Your messages
              </p>
              {tickets.slice(0, 5).map((t) => (
                <div key={t.id} className="rounded-2xl bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{t.category}</span>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{t.message}</p>
                  {t.admin_reply ? (
                    <p className="mt-2 rounded-xl bg-primary/10 p-2 text-xs">
                      <span className="font-semibold">Reply: </span>
                      {t.admin_reply}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
