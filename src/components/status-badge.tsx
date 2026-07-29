import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ItemStatus } from "@/lib/freshtrack";

const STYLES: Record<ItemStatus, string> = {
  fresh: "bg-success/15 text-success",
  soon: "bg-warning/20 text-warning",
  expired: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
