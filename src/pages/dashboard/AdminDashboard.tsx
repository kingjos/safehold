import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  Wallet,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const recentActivity = [
  {
    id: 1,
    type: "escrow_created",
    description: "New escrow created by ABC Company",
    amount: 500000,
    time: "2 minutes ago"
  },
  {
    id: 2,
    type: "dispute_opened",
    description: "Dispute raised for ESC-2024-0125",
    amount: 150000,
    time: "15 minutes ago"
  },
  {
    id: 3,
    type: "funds_released",
    description: "Funds released to TechCorp Nigeria",
    amount: 350000,
    time: "1 hour ago"
  },
  {
    id: 4,
    type: "user_registered",
    description: "New vendor registered: Design Studio NG",
    time: "2 hours ago"
  }
];

const pendingDisputes = [
  {
    id: "DSP-001",
    escrowId: "ESC-2024-0125",
    client: "ABC Company",
    vendor: "WebDev Solutions",
    amount: 150000,
    status: "pending_review"
  },
  {
    id: "DSP-002",
    escrowId: "ESC-2024-0098",
    client: "Fashion Hub",
    vendor: "Creative Agency",
    amount: 75000,
    status: "under_investigation"
  }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case "escrow_created":
      return <FileText className="w-5 h-5 text-primary" />;
    case "dispute_opened":
      return <AlertTriangle className="w-5 h-5 text-destructive" />;
    case "funds_released":
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    case "user_registered":
      return <Users className="w-5 h-5 text-secondary" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
};

const AdminDashboard = () => {
  return (
    <DashboardLayout userType="admin">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              Export Report
            </Button>
            <Button variant="default">
              <Shield className="w-5 h-5" />
              Security Scan
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium text-success flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +24.5%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Total in Escrow</p>
            <p className="text-2xl font-display font-bold">₦45.2M</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-xs font-medium text-success flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +156
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-display font-bold">12,847</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-success" />
              </div>
              <span className="text-xs font-medium text-success flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +89
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Active Transactions</p>
            <p className="text-2xl font-display font-bold">1,234</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <span className="text-xs font-medium text-destructive flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" />
                -3
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Open Disputes</p>
            <p className="text-2xl font-display font-bold">12</p>
          </div>
        </div>

        {/* Charts & Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">Recent Activity</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  {activity.amount && (
                    <p className="text-sm font-semibold">₦{activity.amount.toLocaleString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending Disputes */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">Pending Disputes</h2>
              <Link to="/admin/disputes" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {pendingDisputes.map((dispute) => (
                <div key={dispute.id} className="p-4 rounded-xl bg-background border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{dispute.id}</p>
                      <p className="text-xs text-muted-foreground">Escrow: {dispute.escrowId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dispute.status === "pending_review" 
                        ? "status-pending" 
                        : "status-active"
                    }`}>
                      {dispute.status === "pending_review" ? "Pending Review" : "Under Investigation"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">Client: </span>
                      <span>{dispute.client}</span>
                    </div>
                    <p className="font-semibold">₦{dispute.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-sm mb-3">
                    <span className="text-muted-foreground">Vendor: </span>
                    <span>{dispute.vendor}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="flex-1">
                      Review
                    </Button>
                    <Button variant="outline" size="sm">
                      Escalate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
