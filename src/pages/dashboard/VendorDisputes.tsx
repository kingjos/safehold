import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeList } from "@/components/dispute/DisputeList";
import { Dispute } from "@/types/dispute";
import { AlertTriangle } from "lucide-react";

const mockDisputes: Dispute[] = [
  {
    id: "DSP-003",
    escrowId: "ESC-2024-0156",
    escrowTitle: "Mobile App Development",
    amount: 500000,
    status: "awaiting_response",
    reason: "scope_disagreement",
    description: "Client is requesting additional features that were not part of the original scope without additional payment.",
    client: { name: "Fashion Hub Ltd", email: "fashion@example.com" },
    vendor: { name: "AppBuilders Inc", email: "apps@example.com" },
    openedBy: "vendor",
    openedAt: "2024-01-17T11:00:00Z",
    updatedAt: "2024-01-18T09:30:00Z",
    timeline: []
  },
  {
    id: "DSP-004",
    escrowId: "ESC-2024-0089",
    escrowTitle: "Content Writing Services",
    amount: 45000,
    status: "resolved_vendor",
    reason: "payment_issues",
    description: "Client refused to release payment despite work completion.",
    client: { name: "Marketing Co", email: "marketing@example.com" },
    vendor: { name: "AppBuilders Inc", email: "apps@example.com" },
    openedBy: "vendor",
    openedAt: "2024-01-08T14:00:00Z",
    updatedAt: "2024-01-12T10:15:00Z",
    timeline: [],
    resolution: {
      type: "pay_vendor",
      description: "Funds released to vendor after admin verified work completion.",
      resolvedBy: "Admin",
      resolvedAt: "2024-01-12T10:15:00Z"
    }
  }
];

const VendorDisputes = () => {
  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Disputes</h1>
            <p className="text-muted-foreground">Track and manage your escrow disputes.</p>
          </div>
        </div>

        <DisputeList disputes={mockDisputes} userType="vendor" />
      </div>
    </DashboardLayout>
  );
};

export default VendorDisputes;
