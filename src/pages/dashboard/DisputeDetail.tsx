import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeStatusBadge } from "@/components/dispute/DisputeStatusBadge";
import { DisputeTimeline } from "@/components/dispute/DisputeTimeline";
import { DisputeActions } from "@/components/dispute/DisputeActions";
import { EvidenceGallery } from "@/components/dispute/EvidenceGallery";
import { AlertBox } from "@/components/dispute/AlertBox";
import { CountdownTimer } from "@/components/dispute/CountdownTimer";
import { VendorResponseForm } from "@/components/dispute/VendorResponseForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Dispute, DisputeEvidence, DisputeEvent } from "@/types/dispute";
import {
  ArrowLeft, AlertTriangle, Copy, User, Building, Calendar, FileText,
  CheckCircle2, DollarSign, Shield
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface DisputeDetailProps {
  userType: "client" | "vendor" | "admin";
}

const dbReasonToLabel: Record<string, string> = {
  service_not_delivered: "item_not_delivered",
  quality_issues: "work_quality_issues",
  late_delivery: "deadline_missed",
  payment_dispute: "payment_issues",
  communication_issues: "communication_breakdown",
  scope_disagreement: "scope_disagreement",
  other: "other",
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
  service_not_delivered: "Service not delivered",
  quality_issues: "Quality issues",
  late_delivery: "Late delivery",
  payment_dispute: "Payment dispute",
  communication_issues: "Communication issues",
  other: "Other",
};

const eventTypeMap: Record<string, DisputeEvent["type"]> = {
  opened: "opened",
  response: "response",
  evidence: "evidence",
  admin_message: "admin_message",
  escalated: "escalated",
  resolved: "resolved",
  closed: "closed",
};

const DisputeDetail = ({ userType }: DisputeDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminSelectedAction, setAdminSelectedAction] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchDispute = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch dispute with transaction
      const { data: d, error } = await supabase
        .from("disputes")
        .select("*, transactions(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!d) return;

      const tx = d.transactions as any;

      // Fetch profiles, evidence, events in parallel
      const userIds = new Set<string>();
      if (tx?.client_id) userIds.add(tx.client_id);
      if (tx?.vendor_id) userIds.add(tx.vendor_id);

      const [profilesRes, evidenceRes, eventsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", Array.from(userIds)),
        supabase
          .from("dispute_evidence")
          .select("*")
          .eq("dispute_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("dispute_events")
          .select("*")
          .eq("dispute_id", id)
          .order("created_at", { ascending: true }),
      ]);

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.user_id, p])
      );

      const clientProfile = profileMap.get(tx?.client_id);
      const vendorProfile = profileMap.get(tx?.vendor_id);

      // Map evidence
      const allEvidence = (evidenceRes.data || []).map((e): DisputeEvidence => ({
        id: e.id,
        type: e.file_type === "image" ? "image" : "document",
        name: e.file_name,
        url: e.file_url,
        uploadedAt: e.created_at,
        uploadedBy: e.uploaded_by === tx?.client_id ? "client" : "vendor",
      }));

      const buyerEvidence = allEvidence.filter((e) => e.uploadedBy === "client");
      const vendorEvidence = allEvidence.filter((e) => e.uploadedBy === "vendor");

      // Map events to timeline
      const timeline: DisputeEvent[] = (eventsRes.data || []).map((ev): DisputeEvent => {
        const actorProfile = profileMap.get(ev.user_id || "");
        const isClient = ev.user_id === tx?.client_id;
        const isVendor = ev.user_id === tx?.vendor_id;
        const actorRole: DisputeEvent["actorRole"] = isClient ? "client" : isVendor ? "vendor" : ev.user_id ? "admin" : "system";

        return {
          id: ev.id,
          type: eventTypeMap[ev.event_type] || "admin_message",
          title: ev.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          description: ev.description,
          timestamp: ev.created_at,
          actor: actorProfile?.full_name || actorProfile?.email || "System",
          actorRole,
        };
      });

      const isOpenedByClient = d.opened_by === tx?.client_id;
      const createdDate = new Date(d.created_at);
      const deadline = new Date(createdDate.getTime() + 48 * 60 * 60 * 1000);

      const mappedReason = dbReasonToLabel[d.reason] || d.reason;

      const mapped: Dispute = {
        id: d.id,
        escrowId: tx?.id || "",
        escrowTitle: tx?.title || "Unknown Transaction",
        amount: tx?.amount || 0,
        status: d.status,
        reason: mappedReason,
        description: d.description,
        client: {
          name: clientProfile?.full_name || clientProfile?.email || "Unknown",
          email: clientProfile?.email || "",
        },
        vendor: {
          name: vendorProfile?.full_name || vendorProfile?.email || "Unknown",
          email: vendorProfile?.email || "",
        },
        openedBy: isOpenedByClient ? "client" : "vendor",
        openedAt: d.created_at,
        updatedAt: d.updated_at,
        respondByDeadline: deadline > new Date() ? deadline.toISOString() : undefined,
        timeline,
        buyerEvidence,
        vendorEvidence,
        vendorResponse: d.vendor_response || undefined,
        resolution: d.resolution ? (() => {
          try {
            const parsed = typeof d.resolution === "string" ? JSON.parse(d.resolution) : d.resolution;
            return parsed;
          } catch {
            return undefined;
          }
        })() : undefined,
      };

      setDispute(mapped);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      toast({ title: "Error", description: "Failed to load dispute details.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispute();
  }, [id]);

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

  const handleAdminAction = async (action: string) => {
    if (!dispute) return;
    setResolving(true);
    try {
      const { error } = await supabase.rpc("resolve_dispute", {
        p_dispute_id: dispute.id,
        p_action: action,
        p_partial_amount: action === "partial_refund" ? Number(partialAmount) : null,
      });

      if (error) throw error;

      toast({ title: "Decision applied", description: "Both parties have been notified." });
      setAdminSelectedAction(null);
      setPartialAmount("");
      await fetchDispute();
    } catch (error: any) {
      console.error("Resolve dispute error:", error);
      toast({
        title: "Failed to resolve dispute",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType={userType}>
        <div className="p-6 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-40" />
          <div className="flex gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout userType={userType}>
        <div className="p-6 lg:p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
          <p className="text-muted-foreground mb-4">The dispute you're looking for doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate(getBackPath())}>Back to Disputes</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isResolved = ["resolved", "closed"].includes(dispute.status);
  const isAwaitingVendor = dispute.status === "awaiting_response" || dispute.status === "open";

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
                <h1 className="text-2xl font-display font-bold">{dispute.id.slice(0, 8).toUpperCase()}</h1>
                <button onClick={() => copyToClipboard(dispute.id, "Dispute ID")} className="p-1 hover:bg-accent rounded">
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-muted-foreground">{dispute.escrowTitle}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <DisputeStatusBadge status={dispute.status} />
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  {reasonLabels[dispute.reason] || dispute.reason}
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
                  {reasonLabels[dispute.reason] || dispute.reason}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{dispute.description}</p>
              {dispute.buyerEvidence && dispute.buyerEvidence.length > 0 && (
                <EvidenceGallery evidence={dispute.buyerEvidence} title="Uploaded Evidence" />
              )}
            </div>

            {/* Vendor Response Section */}
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
                <VendorResponseForm disputeId={dispute.id} onSuccess={fetchDispute} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {isAwaitingVendor ? "Waiting for vendor response..." : "No response submitted."}
                </p>
              )}
            </div>

            {/* Timeline */}
            {dispute.timeline.length > 0 && (
              <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
                <h2 className="text-lg font-display font-semibold mb-6">Dispute Timeline</h2>
                <DisputeTimeline events={dispute.timeline} />
              </div>
            )}

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
                      <Button className="w-full" disabled={resolving || (adminSelectedAction === "partial_refund" && !partialAmount)}>
                        {resolving ? "Processing..." : "Confirm Decision"}
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

            {/* Client actions */}
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
                  <p className="font-medium truncate">{dispute.escrowId.slice(0, 8).toUpperCase()}</p>
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
