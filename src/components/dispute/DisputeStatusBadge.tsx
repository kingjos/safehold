import { DisputeStatus } from "@/types/dispute";

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
}

const statusConfig: Record<DisputeStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "status-pending"
  },
  under_review: {
    label: "Under Review",
    className: "status-active"
  },
  awaiting_response: {
    label: "Awaiting Response",
    className: "bg-secondary/10 text-secondary border-secondary/20"
  },
  resolved: {
    label: "Resolved",
    className: "status-completed"
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border"
  },
  escalated: {
    label: "Escalated",
    className: "bg-destructive/10 text-destructive border-destructive/20"
  }
};

export const DisputeStatusBadge = ({ status }: DisputeStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.open;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};
