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
    reason: "work_quality_issues",
    description: "The delivered website does not meet the agreed specifications. Several features are missing and the design differs from the mockups.",
    client: { name: "John Doe", email: "john@example.com" },
    vendor: { name: "TechCorp Nigeria", email: "tech@example.com" },
    openedBy: "client",
    openedAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    timeline: []
  },
  {
    id: "DSP-002",
    escrowId: "ESC-2024-0098",
    escrowTitle: "Logo Design",
    amount: 75000,
    status: "resolved_client",
    reason: "work_not_completed",
    description: "Vendor stopped responding after receiving the first milestone payment.",
    client: { name: "John Doe", email: "john@example.com" },
    vendor: { name: "Creative Studios", email: "creative@example.com" },
    openedBy: "client",
    openedAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-14T16:45:00Z",
    timeline: [],
    resolution: {
      type: "refund_client",
      description: "Full refund issued to client after vendor failed to respond.",
      resolvedBy: "Admin",
      resolvedAt: "2024-01-14T16:45:00Z"
    }
  }
];

const ClientDisputes = () => {
  return (
    <DashboardLayout userType="client">
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

        <DisputeList disputes={mockDisputes} userType="client" />
      </div>
    </DashboardLayout>
  );
};

export default ClientDisputes;
