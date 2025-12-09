import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeStatusBadge } from "@/components/dispute/DisputeStatusBadge";
import { DisputeTimeline } from "@/components/dispute/DisputeTimeline";
import { DisputeActions } from "@/components/dispute/DisputeActions";
import { Button } from "@/components/ui/button";
import { Dispute } from "@/types/dispute";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Copy, 
  User, 
  Building, 
  Calendar,
  FileText,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DisputeDetailProps {
  userType: "client" | "vendor" | "admin";
}

const mockDispute: Dispute = {
  id: "DSP-001",
  escrowId: "ESC-2024-0125",
  escrowTitle: "Website Development Project",
  amount: 350000,
  status: "under_investigation",
  reason: "work_quality_issues",
  description: "The delivered website does not meet the agreed specifications. Several key features that were discussed in our initial meetings are missing, including the customer dashboard and the payment integration. The design also differs significantly from the mockups that were approved. I have requested revisions multiple times but the vendor has not addressed these issues adequately.",
  client: { name: "John Doe", email: "john@example.com" },
  vendor: { name: "TechCorp Nigeria", email: "tech@techcorp.ng" },
  openedBy: "client",
  openedAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-18T14:20:00Z",
  timeline: [
    {
      id: "1",
      type: "opened",
      title: "Dispute Opened",
      description: "Client opened a dispute citing work quality issues.",
      timestamp: "2024-01-15T10:30:00Z",
      actor: "John Doe",
      actorRole: "client"
    },
    {
      id: "2",
      type: "admin_message",
      title: "Case Assigned",
      description: "This dispute has been assigned to our review team. We will investigate and respond within 48 hours.",
      timestamp: "2024-01-15T11:00:00Z",
      actor: "System",
      actorRole: "system"
    },
    {
      id: "3",
      type: "response",
      title: "Vendor Response",
      description: "The features mentioned were not part of the original scope. We delivered exactly what was agreed upon in the initial contract. The design was modified based on client feedback during development.",
      timestamp: "2024-01-16T09:15:00Z",
      actor: "TechCorp Nigeria",
      actorRole: "vendor"
    },
    {
      id: "4",
      type: "evidence",
      title: "Evidence Submitted",
      description: "Client uploaded contract documents and email correspondence as supporting evidence.",
      timestamp: "2024-01-17T14:30:00Z",
      actor: "John Doe",
      actorRole: "client"
    },
    {
      id: "5",
      type: "admin_message",
      title: "Admin Review",
      description: "We have reviewed the submitted evidence. Additional information has been requested from the vendor regarding the scope agreement.",
      timestamp: "2024-01-18T14:20:00Z",
      actor: "Admin Sarah",
      actorRole: "admin"
    }
  ]
};

const reasonLabels: Record<string, string> = {
  work_not_completed: "Work not completed",
  work_quality_issues: "Work quality issues",
  payment_issues: "Payment issues",
  communication_breakdown: "Communication breakdown",
  scope_disagreement: "Scope disagreement",
  deadline_missed: "Deadline missed",
  other: "Other"
};

const DisputeDetail = ({ userType }: DisputeDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const handleAction = (action: string, data?: any) => {
    console.log("Dispute action:", action, data);
    // This would trigger API calls in a real implementation
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBackPath = () => {
    switch (userType) {
      case "client":
        return "/dashboard/disputes";
      case "vendor":
        return "/vendor/disputes";
      case "admin":
        return "/admin/disputes";
    }
  };

  const getEscrowPath = () => {
    switch (userType) {
      case "client":
        return `/dashboard/transactions/${mockDispute.escrowId}`;
      case "vendor":
        return `/vendor/transactions/${mockDispute.escrowId}`;
      case "admin":
        return `/admin/transactions/${mockDispute.escrowId}`;
    }
  };

  return (
    <DashboardLayout userType={userType}>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(getBackPath())} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Disputes
        </Button>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-display font-bold">{mockDispute.id}</h1>
                <button
                  onClick={() => copyToClipboard(mockDispute.id, "Dispute ID")}
                  className="p-1 hover:bg-accent rounded"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground">{mockDispute.escrowTitle}</p>
              <div className="flex items-center gap-2 mt-2">
                <DisputeStatusBadge status={mockDispute.status} />
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  {reasonLabels[mockDispute.reason]}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Disputed Amount</p>
            <p className="text-3xl font-display font-bold text-destructive">
              {formatCurrency(mockDispute.amount)}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-4">Dispute Description</h2>
              <p className="text-muted-foreground leading-relaxed">{mockDispute.description}</p>
            </div>

            {/* Timeline */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-6">Dispute Timeline</h2>
              <DisputeTimeline events={mockDispute.timeline} />
            </div>

            {/* Actions */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-4">Actions</h2>
              <DisputeActions
                status={mockDispute.status}
                userType={userType}
                onAction={handleAction}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Parties Involved</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Client</p>
                    <p className="font-medium">{mockDispute.client.name}</p>
                    <p className="text-sm text-muted-foreground">{mockDispute.client.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor</p>
                    <p className="font-medium">{mockDispute.vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{mockDispute.vendor.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Important Dates</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Opened</p>
                    <p className="text-sm font-medium">
                      {format(new Date(mockDispute.openedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">
                      {format(new Date(mockDispute.updatedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Escrow */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Related Escrow</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{mockDispute.escrowId}</p>
                  <p className="text-sm text-muted-foreground truncate">{mockDispute.escrowTitle}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => navigate(getEscrowPath())}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Resolution (if resolved) */}
            {mockDispute.resolution && (
              <div className="p-6 rounded-2xl bg-success/10 border border-success/20">
                <h3 className="font-semibold mb-3 text-success-foreground">Resolution</h3>
                <p className="text-sm mb-2">{mockDispute.resolution.description}</p>
                <p className="text-xs text-muted-foreground">
                  Resolved by {mockDispute.resolution.resolvedBy} on{" "}
                  {format(new Date(mockDispute.resolution.resolvedAt), "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisputeDetail;
