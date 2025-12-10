import { useEffect, useState } from "react";
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
  Users,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<'transactions'>;

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending_funding: "status-pending",
    funded: "status-active",
    in_progress: "status-active",
    pending_release: "bg-primary/10 text-primary border-primary/20",
    completed: "status-completed",
    disputed: "status-disputed",
    cancelled: "status-pending",
    refunded: "status-pending"
  };
  const labels: Record<string, string> = {
    pending_funding: "Pending Funding",
    funded: "Ready to Start",
    in_progress: "In Progress",
    pending_release: "Pending Release",
    completed: "Completed",
    disputed: "Disputed",
    cancelled: "Cancelled",
    refunded: "Refunded"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "status-pending"}`}>
      {labels[status] || status}
    </span>
  );
};

const VendorDashboard = () => {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingRelease: 0,
    earnedThisMonth: 0,
    activeJobs: 0
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchStats();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', user?.id)
        .in('status', ['funded', 'in_progress', 'pending_release'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get pending release amount
      const { data: pendingData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('vendor_id', user?.id)
        .eq('status', 'pending_release');

      const pendingRelease = pendingData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get earned this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: earnedData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('vendor_id', user?.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString());

      const earnedThisMonth = earnedData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get active jobs count
      const { count: activeCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('vendor_id', user?.id)
        .in('status', ['funded', 'in_progress', 'pending_release']);

      setStats({
        pendingRelease,
        earnedThisMonth,
        activeJobs: activeCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const displayName = profile?.full_name?.split(' ')[0] || 'Vendor';

  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Welcome, {displayName}!</h1>
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
            <p className="text-2xl font-display font-bold">₦{stats.pendingRelease.toLocaleString()}</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Earned This Month</p>
            <p className="text-2xl font-display font-bold">₦{stats.earnedThisMonth.toLocaleString()}</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
            <p className="text-2xl font-display font-bold">{stats.activeJobs}</p>
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
              <Link to="/vendor/escrows">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <FileText className="w-5 h-5 text-secondary" />
                  View All Jobs
                </Button>
              </Link>
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active jobs yet</p>
                <p className="text-sm text-muted-foreground mt-1">Jobs will appear here when clients assign you to escrows</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((job) => (
                  <Link 
                    key={job.id}
                    to={`/vendor/escrows/${job.id}`}
                    className="block p-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">Client ID: {job.client_id.slice(0, 8)}...</p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Escrow Amount</p>
                        <p className="font-display font-bold text-lg">₦{Number(job.amount).toLocaleString()}</p>
                      </div>
                      {job.due_date && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Deadline</p>
                          <p className="font-medium">{new Date(job.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;
