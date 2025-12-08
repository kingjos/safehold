import { Badge } from "@/components/ui/badge";

type EscrowStatus = "pending" | "funded" | "in_progress" | "completed" | "released" | "disputed" | "cancelled";

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
}

const statusConfig: Record<EscrowStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending Payment", variant: "outline" },
  funded: { label: "Funded", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  released: { label: "Released", variant: "default" },
  disputed: { label: "Disputed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
