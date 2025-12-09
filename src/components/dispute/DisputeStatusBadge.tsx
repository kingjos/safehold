import { DisputeStatus } from "@/types/dispute";

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
}

const statusConfig: Record<DisputeStatus, { label: string; className: string }> = {
  pending_review: {
    label: "Pending Review",
    className: "status-pending"
  },
  under_investigation: {
    label: "Under Investigation",
    className: "status-active"
  },
  awaiting_response: {
    label: "Awaiting Response",
    className: "bg-secondary/10 text-secondary border-secondary/20"
  },
  resolved_client: {
    label: "Resolved (Client)",
    className: "status-completed"
  },
  resolved_vendor: {
    label: "Resolved (Vendor)",
    className: "status-completed"
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border"
  }
};

export const DisputeStatusBadge = ({ status }: DisputeStatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};
