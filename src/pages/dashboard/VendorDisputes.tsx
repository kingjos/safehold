import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeList } from "@/components/dispute/DisputeList";
import { Dispute } from "@/types/dispute";
import { AlertTriangle } from "lucide-react";

const mockDisputes: Dispute[] = [
  {
    id: "DSP-001",
    escrowId: "ESC-2024-0125",
    escrowTitle: "Website Development Project",
    amount: 350000,
    status: "under_investigation",
    reason: "item_not_as_described",
    description: "The delivered website does not meet the agreed specifications.",
    client: { name: "John Doe", email: "john@example.com" },
    vendor: { name: "TechCorp Nigeria", email: "tech@techcorp.ng" },
    openedBy: "client",
    openedAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    respondByDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    timeline: []
  },
  {
    id: "DSP-003",
    escrowId: "ESC-2024-0156",
    escrowTitle: "E-commerce Platform",
    amount: 1200000,
    status: "awaiting_response",
    reason: "scope_disagreement",
    description: "Client is requesting additional features that were not part of the original scope.",
    client: { name: "RetailMax Nigeria", email: "retail@example.com" },
    vendor: { name: "TechCorp Nigeria", email: "tech@techcorp.ng" },
    openedBy: "client",
    openedAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-18T09:30:00Z",
    respondByDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
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
    vendor: { name: "TechCorp Nigeria", email: "tech@techcorp.ng" },
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
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Disputes</h1>
            <p className="text-muted-foreground">Track and respond to escrow disputes.</p>
          </div>
        </div>
        <DisputeList disputes={mockDisputes} userType="vendor" />
      </div>
    </DashboardLayout>
  );
};

export default VendorDisputes;
