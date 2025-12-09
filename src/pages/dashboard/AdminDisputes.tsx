import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeList } from "@/components/dispute/DisputeList";
import { Dispute } from "@/types/dispute";
import { AlertTriangle, TrendingDown, Clock, CheckCircle2 } from "lucide-react";

const mockDisputes: Dispute[] = [
  {
    id: "DSP-001",
    escrowId: "ESC-2024-0125",
    escrowTitle: "Website Development Project",
    amount: 350000,
    status: "pending_review",
    reason: "work_quality_issues",
    description: "The delivered website does not meet the agreed specifications.",
    client: { name: "ABC Company", email: "abc@example.com" },
    vendor: { name: "WebDev Solutions", email: "webdev@example.com" },
    openedBy: "client",
    openedAt: "2024-01-18T10:30:00Z",
    updatedAt: "2024-01-18T10:30:00Z",
    timeline: []
  },
  {
    id: "DSP-002",
    escrowId: "ESC-2024-0098",
    escrowTitle: "Graphic Design Package",
    amount: 75000,
    status: "under_investigation",
    reason: "communication_breakdown",
    description: "Vendor is unresponsive and has missed multiple deadlines.",
    client: { name: "Fashion Hub", email: "fashion@example.com" },
    vendor: { name: "Creative Agency", email: "creative@example.com" },
    openedBy: "client",
    openedAt: "2024-01-16T08:00:00Z",
    updatedAt: "2024-01-17T14:20:00Z",
    timeline: []
  },
  {
    id: "DSP-003",
    escrowId: "ESC-2024-0156",
    escrowTitle: "E-commerce Platform",
    amount: 1200000,
    status: "awaiting_response",
    reason: "scope_disagreement",
    description: "Dispute over additional feature requests and timeline extensions.",
    client: { name: "RetailMax Nigeria", email: "retail@example.com" },
    vendor: { name: "TechBuilders Ltd", email: "tech@example.com" },
    openedBy: "vendor",
    openedAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-18T09:30:00Z",
    timeline: []
  },
  {
    id: "DSP-004",
    escrowId: "ESC-2024-0045",
    escrowTitle: "SEO Services",
    amount: 150000,
    status: "resolved_client",
    reason: "work_not_completed",
    description: "Service was not delivered as promised.",
    client: { name: "StartupNG", email: "startup@example.com" },
    vendor: { name: "Digital Marketing Pro", email: "digital@example.com" },
    openedBy: "client",
    openedAt: "2024-01-10T14:00:00Z",
    updatedAt: "2024-01-14T16:45:00Z",
    timeline: [],
    resolution: {
      type: "refund_client",
      description: "Full refund to client due to non-delivery.",
      resolvedBy: "Admin John",
      resolvedAt: "2024-01-14T16:45:00Z"
    }
  }
];

const AdminDisputes = () => {
  const pendingCount = mockDisputes.filter(d => d.status === "pending_review").length;
  const activeCount = mockDisputes.filter(d => 
    ["under_investigation", "awaiting_response"].includes(d.status)
  ).length;
  const resolvedCount = mockDisputes.filter(d => 
    ["resolved_client", "resolved_vendor", "closed"].includes(d.status)
  ).length;

  return (
    <DashboardLayout userType="admin">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Dispute Management</h1>
              <p className="text-muted-foreground">Review and resolve platform disputes.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-display font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-display font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Disputes</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-display font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved This Month</p>
              </div>
            </div>
          </div>
        </div>

        <DisputeList disputes={mockDisputes} userType="admin" />
      </div>
    </DashboardLayout>
  );
};

export default AdminDisputes;
