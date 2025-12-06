import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  TrendingUp,
  FileText,
  Star,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

const activeJobs = [
  {
    id: "ESC-001",
    title: "Website Development",
    client: "ABC Company Ltd",
    amount: 350000,
    status: "in_progress",
    deadline: "2024-01-30"
  },
  {
    id: "ESC-002",
    title: "E-commerce Platform",
    client: "Fashion Hub Nigeria",
    amount: 500000,
    status: "pending_start",
    deadline: "2024-02-15"
  }
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending_start: "status-pending",
    in_progress: "status-active",
    completed: "status-completed",
    awaiting_confirmation: "bg-primary/10 text-primary border-primary/20"
  };
  const labels: Record<string, string> = {
    pending_start: "Pending Start",
    in_progress: "In Progress",
    completed: "Completed",
    awaiting_confirmation: "Awaiting Confirmation"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const VendorDashboard = () => {
  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Vendor Dashboard</h1>
            <p className="text-muted-foreground">Manage your jobs and earnings.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-secondary">
              <Star className="w-5 h-5 fill-secondary" />
              <span className="font-semibold">4.8</span>
            </div>
            <span className="text-muted-foreground">• 47 reviews</span>
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
                <TrendingUp className="w-3 h-3" />
                +8.2%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-display font-bold">₦1,850,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Pending Release</p>
            <p className="text-2xl font-display font-bold">₦850,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Earned This Month</p>
            <p className="text-2xl font-display font-bold">₦2,400,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
            <p className="text-2xl font-display font-bold">2</p>
          </div>
        </div>

        {/* Quick Actions & Active Jobs */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3">
                <ArrowUpRight className="w-5 h-5 text-primary" />
                Withdraw to Bank
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <ArrowDownLeft className="w-5 h-5 text-success" />
                Request Payment
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-5 h-5 text-secondary" />
                View Completed Jobs
              </Button>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">Active Jobs</h2>
              <Link to="/vendor/escrows" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-sm text-muted-foreground">{job.client}</p>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Escrow Amount</p>
                      <p className="font-display font-bold text-lg">₦{job.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Deadline</p>
                      <p className="font-medium">{new Date(job.deadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="default" size="sm" className="flex-1">
                      Mark Complete
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
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

export default VendorDashboard;
