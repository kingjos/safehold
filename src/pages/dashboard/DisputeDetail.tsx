import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeStatusBadge } from "@/components/dispute/DisputeStatusBadge";
import { DisputeTimeline } from "@/components/dispute/DisputeTimeline";
import { DisputeActions } from "@/components/dispute/DisputeActions";
import { EvidenceGallery } from "@/components/dispute/EvidenceGallery";
import { AlertBox } from "@/components/dispute/AlertBox";
import { CountdownTimer } from "@/components/dispute/CountdownTimer";
import { EvidenceUpload } from "@/components/dispute/EvidenceUpload";
import { VendorResponseForm } from "@/components/dispute/VendorResponseForm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dispute, DisputeEvidence } from "@/types/dispute";
import { 
  ArrowLeft, AlertTriangle, Copy, User, Building, Calendar, FileText, 
  ExternalLink, MessageSquare, CheckCircle2, XCircle, DollarSign, Upload, Shield
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DisputeDetailProps {
  userType: "client" | "vendor" | "admin";
}

const mockBuyerEvidence: DisputeEvidence[] = [
  { id: "e1", type: "image", name: "screenshot-dashboard.png", url: "/placeholder.svg", uploadedAt: "2024-01-17T14:30:00Z", uploadedBy: "client" },
  { id: "e2", type: "document", name: "contract-agreement.pdf", url: "#", uploadedAt: "2024-01-17T14:32:00Z", uploadedBy: "client" },
  { id: "e3", type: "image", name: "email-correspondence.png", url: "/placeholder.svg", uploadedAt: "2024-01-17T14:35:00Z", uploadedBy: "client" },
];

const mockVendorEvidence: DisputeEvidence[] = [
  { id: "e4", type: "image", name: "delivery-proof.png", url: "/placeholder.svg", uploadedAt: "2024-01-18T09:00:00Z", uploadedBy: "vendor" },
  { id: "e5", type: "document", name: "waybill-receipt.pdf", url: "#", uploadedAt: "2024-01-18T09:05:00Z", uploadedBy: "vendor" },
];

// Mock dispute data for 3 scenarios
const mockDisputes: Record<string, Dispute> = {
  "DSP-001": {
    id: "DSP-001",
    escrowId: "ESC-2024-0125",
    escrowTitle: "Website Development Project",
    amount: 350000,
    status: "under_investigation",
    reason: "item_not_as_described",
    description: "The delivered website does not meet the agreed specifications. Several key features that were discussed in our initial meetings are missing, including the customer dashboard and the payment integration.",
    client: { name: "John Doe", email: "john@example.com" },
    vendor: { name: "TechCorp Nigeria", email: "tech@techcorp.ng" },
    openedBy: "client",
    openedAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    respondByDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    buyerEvidence: mockBuyerEvidence,
    vendorEvidence: mockVendorEvidence,
    vendorResponse: "The features mentioned were not part of the original scope. We delivered exactly what was agreed upon in the initial contract.",
    timeline: [
      { id: "1", type: "opened", title: "Dispute Opened", description: "Buyer opened a dispute citing item not as described.", timestamp: "2024-01-15T10:30:00Z", actor: "John Doe", actorRole: "client" },
      { id: "2", type: "evidence", title: "Buyer Submitted Evidence", description: "Contract documents and screenshots uploaded.", timestamp: "2024-01-17T14:30:00Z", actor: "John Doe", actorRole: "client" },
      { id: "3", type: "admin_message", title: "Case Assigned", description: "This dispute has been assigned to our review team.", timestamp: "2024-01-15T11:00:00Z", actor: "System", actorRole: "system" },
      { id: "4", type: "response", title: "Vendor Responded", description: "Vendor provided explanation and uploaded delivery proof.", timestamp: "2024-01-18T09:00:00Z", actor: "TechCorp Nigeria", actorRole: "vendor" },
      { id: "5", type: "admin_message", title: "Admin Reviewing", description: "Evidence from both parties is under review.", timestamp: "2024-01-18T14:20:00Z", actor: "Admin Sarah", actorRole: "admin" },
    ],
  },
  "DSP-002": {
    id: "DSP-002",
    escrowId: "ESC-2024-0098",
    escrowTitle: "Logo Design",
    amount: 75000,
    status: "resolved_client",
    reason: "item_not_delivered",
    description: "Vendor stopped responding after receiving the first milestone payment.",
    client: { name: "John Doe", email: "john@example.com" },
    vendor: { name: "Creative Studios", email: "creative@example.com" },
    openedBy: "client",
    openedAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-14T16:45:00Z",
    buyerEvidence: [
      { id: "e6", type: "image", name: "chat-screenshot.png", url: "/placeholder.svg", uploadedAt: "2024-01-10T08:05:00Z", uploadedBy: "client" },
    ],
    vendorEvidence: [],
    timeline: [
      { id: "1", type: "opened", title: "Dispute Opened", description: "Buyer reported item not delivered.", timestamp: "2024-01-10T08:00:00Z", actor: "John Doe", actorRole: "client" },
      { id: "2", type: "admin_message", title: "Awaiting Vendor Response", description: "Vendor has 48 hours to respond.", timestamp: "2024-01-10T09:00:00Z", actor: "System", actorRole: "system" },
      { id: "3", type: "admin_message", title: "Vendor Did Not Respond", description: "The response window has expired.", timestamp: "2024-01-12T09:00:00Z", actor: "System", actorRole: "system" },
      { id: "4", type: "resolved", title: "Resolved: Refunded Buyer", description: "Full refund issued to buyer due to non-delivery.", timestamp: "2024-01-14T16:45:00Z", actor: "Admin", actorRole: "admin" },
    ],
    resolution: {
      type: "refund_client",
      description: "Full refund issued to buyer due to non-delivery and vendor non-response.",
      resolvedBy: "Admin John",
      resolvedAt: "2024-01-14T16:45:00Z",
    },
  },
  "DSP-003": {
    id: "DSP-003",
    escrowId: "ESC-2024-0156",
    escrowTitle: "E-commerce Platform",
    amount: 1200000,
    status: "awaiting_response",
    reason: "scope_disagreement",
    description: "Dispute over additional feature requests and timeline extensions.",
    client: { name: "RetailMax Nigeria", email: "retail@example.com" },
    vendor: { name: "TechBuilders Ltd", email: "tech@example.com" },
    openedBy: "client",
    openedAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-18T09:30:00Z",
    respondByDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    buyerEvidence: mockBuyerEvidence.slice(0, 2),
    vendorEvidence: [],
    timeline: [
      { id: "1", type: "opened", title: "Dispute Opened", description: "Buyer raised a scope disagreement.", timestamp: "2024-01-15T11:00:00Z", actor: "RetailMax Nigeria", actorRole: "client" },
      { id: "2", type: "evidence", title: "Buyer Submitted Evidence", description: "Project scope documents uploaded.", timestamp: "2024-01-15T12:00:00Z", actor: "RetailMax Nigeria", actorRole: "client" },
      { id: "3", type: "admin_message", title: "Waiting for Vendor Response", description: "Vendor has been notified and has 48 hours to respond.", timestamp: "2024-01-15T12:30:00Z", actor: "System", actorRole: "system" },
    ],
  },
};

const reasonLabels: Record<string, string> = {
  item_not_delivered: "Item not delivered",
  item_not_as_described: "Item not as described",
  damaged_item: "Damaged item",
  wrong_item: "Wrong item",
  work_not_completed: "Work not completed",
  work_quality_issues: "Work quality issues",
  payment_issues: "Payment issues",
  communication_breakdown: "Communication breakdown",
  scope_disagreement: "Scope disagreement",
  deadline_missed: "Deadline missed",
  other: "Other",
};

const DisputeDetail = ({ userType }: DisputeDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendorResponseText, setVendorResponseText] = useState("");
  const [adminSelectedAction, setAdminSelectedAction] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState("");

  const dispute = mockDisputes[id || "DSP-001"] || mockDisputes["DSP-001"];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
  };

  const getBackPath = () => {
    switch (userType) {
      case "client": return "/dashboard/disputes";
      case "vendor": return "/vendor/disputes";
      case "admin": return "/admin/disputes";
    }
  };

  const handleAction = (action: string, data?: any) => {
    console.log("Dispute action:", action, data);
  };

  const handleVendorSubmitResponse = () => {
    if (!vendorResponseText.trim()) {
      toast({ title: "Empty response", description: "Please provide an explanation.", variant: "destructive" });
      return;
    }
    toast({ title: "Response submitted", description: "Your response has been recorded. Status changed to Under Review." });
    setVendorResponseText("");
  };

  const handleAdminAction = (action: string) => {
    const labels: Record<string, string> = {
      refund_buyer: "Refund Buyer",
      release_vendor: "Release funds to Vendor",
      partial_refund: "Partial Refund",
    };
    toast({ title: "Decision applied", description: `Action: ${labels[action] || action}. Both parties have been notified.` });
    setAdminSelectedAction(null);
  };

  const isResolved = ["resolved_client", "resolved_vendor", "closed"].includes(dispute.status);
  const isAwaitingVendor = dispute.status === "awaiting_response" || dispute.status === "pending_review";

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
                <h1 className="text-2xl font-display font-bold">{dispute.id}</h1>
                <button onClick={() => copyToClipboard(dispute.id, "Dispute ID")} className="p-1 hover:bg-accent rounded">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground">{dispute.escrowTitle}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <DisputeStatusBadge status={dispute.status} />
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  {reasonLabels[dispute.reason]}
                </span>
                {dispute.respondByDeadline && !isResolved && userType !== "client" && (
                  <CountdownTimer deadline={dispute.respondByDeadline} />
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Disputed Amount</p>
            <p className="text-3xl font-display font-bold text-destructive">
              {formatCurrency(dispute.amount)}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        {!isResolved && (
          <AlertBox variant="info">
            {userType === "vendor" && isAwaitingVendor
              ? "Failure to respond within the deadline may result in automatic refund to buyer."
              : "This dispute is currently under review. Funds are temporarily held during dispute review."
            }
          </AlertBox>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Overview */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-4">Transaction Overview</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Buyer</p>
                    <p className="font-medium">{dispute.client.name}</p>
                    <p className="text-sm text-muted-foreground">{dispute.client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendor</p>
                    <p className="font-medium">{dispute.vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{dispute.vendor.email}</p>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Product / Service</p>
                  <p className="font-medium">{dispute.escrowTitle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(dispute.amount)}</p>
                </div>
              </div>
            </div>

            {/* Buyer Evidence Section */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-2">Buyer's Claim</h2>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Reason</p>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  {reasonLabels[dispute.reason]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{dispute.description}</p>
              {dispute.buyerEvidence && dispute.buyerEvidence.length > 0 && (
                <EvidenceGallery evidence={dispute.buyerEvidence} title="Uploaded Evidence" />
              )}
            </div>

            {/* Vendor Evidence / Response Section */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-4">Vendor's Response</h2>
              {dispute.vendorResponse ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{dispute.vendorResponse}</p>
                  {dispute.vendorEvidence && dispute.vendorEvidence.length > 0 && (
                    <EvidenceGallery evidence={dispute.vendorEvidence} title="Vendor's Proof" />
                  )}
                </div>
              ) : userType === "vendor" && !isResolved ? (
                <VendorResponseForm disputeId={dispute.id} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isAwaitingVendor ? "Waiting for vendor response..." : "No response submitted."}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h2 className="text-lg font-display font-semibold mb-6">Dispute Timeline</h2>
              <DisputeTimeline events={dispute.timeline} />
            </div>

            {/* Admin Action Panel */}
            {userType === "admin" && !isResolved && (
              <div className="p-6 rounded-2xl bg-card border-2 border-primary/20 shadow-soft">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-display font-semibold">Admin Decision Panel</h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { key: "release_vendor", label: "Release funds to Vendor", icon: <CheckCircle2 className="w-4 h-4" />, style: "border-success/30 bg-success/5 hover:bg-success/10" },
                    { key: "refund_buyer", label: "Refund Buyer", icon: <DollarSign className="w-4 h-4" />, style: "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" },
                    { key: "partial_refund", label: "Partial Refund", icon: <DollarSign className="w-4 h-4" />, style: "border-warning/30 bg-warning/5 hover:bg-warning/10" },
                  ].map((action) => (
                    <button
                      key={action.key}
                      onClick={() => setAdminSelectedAction(action.key)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${action.style} ${
                        adminSelectedAction === action.key ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {action.icon}
                        <span className="text-sm font-medium">{action.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {adminSelectedAction === "partial_refund" && (
                  <div className="mb-4 space-y-2">
                    <Label>Refund Amount (NGN)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount..."
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum: {formatCurrency(dispute.amount)}
                    </p>
                  </div>
                )}

                {adminSelectedAction && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="w-full" disabled={adminSelectedAction === "partial_refund" && !partialAmount}>
                        Confirm Decision
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {adminSelectedAction === "refund_buyer" && "Are you sure you want to refund the buyer?"}
                          {adminSelectedAction === "release_vendor" && "Are you sure you want to release funds to the vendor?"}
                          {adminSelectedAction === "partial_refund" && `Are you sure you want to issue a partial refund of ${formatCurrency(Number(partialAmount))}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action will be final. Both parties will be notified of the decision.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAdminAction(adminSelectedAction)}>
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            {/* Client/Vendor general actions for non-admin */}
            {userType !== "admin" && !isResolved && userType === "client" && (
              <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
                <h2 className="text-lg font-display font-semibold mb-4">Actions</h2>
                <DisputeActions status={dispute.status} userType={userType} onAction={handleAction} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dates */}
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Important Dates</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Opened</p>
                    <p className="text-sm font-medium">
                      {format(new Date(dispute.openedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">
                      {format(new Date(dispute.updatedAt), "MMM d, yyyy 'at' h:mm a")}
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
                  <p className="font-medium truncate">{dispute.escrowId}</p>
                  <p className="text-sm text-muted-foreground truncate">{dispute.escrowTitle}</p>
                </div>
              </div>
            </div>

            {/* Resolution */}
            {dispute.resolution && (
              <div className="p-6 rounded-2xl bg-success/10 border border-success/20">
                <h3 className="font-semibold mb-3 text-success">Resolution</h3>
                <p className="text-sm font-medium mb-1">
                  {dispute.resolution.type === "refund_client" && "Resolved: Refunded Buyer"}
                  {dispute.resolution.type === "pay_vendor" && "Resolved: Paid Vendor"}
                  {dispute.resolution.type === "partial_refund" && `Resolved: Partial Refund (${formatCurrency(dispute.resolution.amount || 0)})`}
                  {dispute.resolution.type === "split" && "Resolved: Split Between Parties"}
                  {dispute.resolution.type === "mutual_agreement" && "Resolved: Mutual Agreement"}
                </p>
                <p className="text-sm text-muted-foreground mb-2">{dispute.resolution.description}</p>
                <p className="text-xs text-muted-foreground">
                  Resolved by {dispute.resolution.resolvedBy} on{" "}
                  {format(new Date(dispute.resolution.resolvedAt), "MMM d, yyyy")}
                </p>
              </div>
            )}

            {/* Resolved lock notice */}
            {isResolved && (
              <AlertBox variant="info">
                This dispute has been resolved. No further actions can be taken.
              </AlertBox>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DisputeDetail;
