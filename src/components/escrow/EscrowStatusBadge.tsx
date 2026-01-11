import { Badge } from "@/components/ui/badge";

type EscrowStatus = "pending_funding" | "funded" | "in_progress" | "pending_release" | "completed" | "disputed" | "cancelled" | "refunded";

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
}

const statusConfig: Record<EscrowStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_funding: { label: "Pending Funding", variant: "outline" },
  funded: { label: "Funded", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  pending_release: { label: "Pending Release", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  disputed: { label: "Disputed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
};

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
