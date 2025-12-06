import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";

const recentTransactions = [
  {
    id: "ESC-001",
    title: "Website Development",
    vendor: "TechCorp Nigeria",
    amount: 350000,
    status: "in_progress",
    date: "2024-01-15"
  },
  {
    id: "ESC-002",
    title: "Logo Design",
    vendor: "Creative Studios",
    amount: 75000,
    status: "completed",
    date: "2024-01-10"
  },
  {
    id: "ESC-003",
    title: "Mobile App Development",
    vendor: "AppBuilders Ltd",
    amount: 500000,
    status: "pending",
    date: "2024-01-08"
  },
  {
    id: "ESC-004",
    title: "Content Writing",
    vendor: "WriteWell Agency",
    amount: 45000,
    status: "disputed",
    date: "2024-01-05"
  }
];

const getStatusBadge = (status: string) => {
  const styles = {
    pending: "status-pending",
    in_progress: "status-active",
    completed: "status-completed",
    disputed: "status-disputed"
  };
  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    disputed: "Disputed"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  );
};

const ClientDashboard = () => {
  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Welcome back, John!</h1>
            <p className="text-muted-foreground">Here's what's happening with your escrows.</p>
          </div>
          <Link to="/dashboard/escrows/new">
            <Button variant="default" size="lg">
              <Plus className="w-5 h-5" />
              Create Escrow
            </Button>
          </Link>
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
                +12.5%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Wallet Balance</p>
            <p className="text-2xl font-display font-bold">₦2,450,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">In Escrow</p>
            <p className="text-2xl font-display font-bold">₦850,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Released This Month</p>
            <p className="text-2xl font-display font-bold">₦1,250,000</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Active Disputes</p>
            <p className="text-2xl font-display font-bold">1</p>
          </div>
        </div>

        {/* Quick Actions & Recent Transactions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3">
                <ArrowDownLeft className="w-5 h-5 text-success" />
                Fund Wallet
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <ArrowUpRight className="w-5 h-5 text-primary" />
                Withdraw Funds
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-5 h-5 text-secondary" />
                View All Escrows
              </Button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold">Recent Escrows</h2>
              <Link to="/dashboard/escrows" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tx.title}</p>
                      <p className="text-sm text-muted-foreground">{tx.vendor}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₦{tx.amount.toLocaleString()}</p>
                    {getStatusBadge(tx.status)}
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

export default ClientDashboard;
