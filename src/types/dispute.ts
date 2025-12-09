export type DisputeStatus = 
  | "pending_review"
  | "under_investigation"
  | "awaiting_response"
  | "resolved_client"
  | "resolved_vendor"
  | "closed";

export type DisputeReason = 
  | "work_not_completed"
  | "work_quality_issues"
  | "payment_issues"
  | "communication_breakdown"
  | "scope_disagreement"
  | "deadline_missed"
  | "other";

export interface DisputeEvent {
  id: string;
  type: "opened" | "response" | "evidence" | "admin_message" | "escalated" | "resolved" | "closed";
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  actorRole: "client" | "vendor" | "admin" | "system";
}

export interface Dispute {
  id: string;
  escrowId: string;
  escrowTitle: string;
  amount: number;
  status: DisputeStatus;
  reason: DisputeReason;
  description: string;
  client: {
    name: string;
    email: string;
  };
  vendor: {
    name: string;
    email: string;
  };
  openedBy: "client" | "vendor";
  openedAt: string;
  updatedAt: string;
  timeline: DisputeEvent[];
  resolution?: {
    type: "refund_client" | "pay_vendor" | "split" | "mutual_agreement";
    description: string;
    resolvedBy: string;
    resolvedAt: string;
  };
}
