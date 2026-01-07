import { useEffect, useState } from "react";
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
  FileText,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<'transactions'>;

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending_funding: "status-pending",
    funded: "status-active",
    in_progress: "status-active",
    pending_release: "status-active",
    completed: "status-completed",
    disputed: "status-disputed",
    cancelled: "status-pending",
    refunded: "status-pending"
  };
  const labels: Record<string, string> = {
    pending_funding: "Pending Funding",
    funded: "Funded",
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

const ClientDashboard = () => {
  const { user, profile } = useAuth();
  const { balance: walletBalance, loading: walletLoading } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    inEscrow: 0,
    releasedThisMonth: 0,
    activeDisputes: 0
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
        .eq('client_id', user?.id)
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
      // Get in escrow amount (funded + in_progress + pending_release)
      const { data: escrowData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('client_id', user?.id)
        .in('status', ['funded', 'in_progress', 'pending_release']);

      const inEscrow = escrowData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get released this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: releasedData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('client_id', user?.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString());

      const releasedThisMonth = releasedData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get active disputes count
      const { count: disputeCount } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('opened_by', user?.id)
        .in('status', ['open', 'under_review', 'awaiting_response', 'escalated']);

      setStats({
        inEscrow,
        releasedThisMonth,
        activeDisputes: disputeCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const displayName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Welcome back, {displayName}!</h1>
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
            <p className="text-2xl font-display font-bold">
              {walletLoading ? "..." : `₦${walletBalance.toLocaleString()}`}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-secondary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">In Escrow</p>
            <p className="text-2xl font-display font-bold">₦{stats.inEscrow.toLocaleString()}</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Released This Month</p>
            <p className="text-2xl font-display font-bold">₦{stats.releasedThisMonth.toLocaleString()}</p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Active Disputes</p>
            <p className="text-2xl font-display font-bold">{stats.activeDisputes}</p>
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
              <Link to="/dashboard/escrows">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <FileText className="w-5 h-5 text-secondary" />
                  View All Escrows
                </Button>
              </Link>
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
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No escrows yet</p>
                <Link to="/dashboard/escrows/new">
                  <Button variant="link" className="mt-2">
                    Create your first escrow
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <Link 
                    key={tx.id}
                    to={`/dashboard/escrows/${tx.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent/50 transition-colors block"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{tx.title}</p>
                        <p className="text-sm text-muted-foreground">{tx.vendor_email || 'No vendor assigned'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₦{Number(tx.amount).toLocaleString()}</p>
                      {getStatusBadge(tx.status)}
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

export default ClientDashboard;
