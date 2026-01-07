import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionList } from "@/components/wallet/TransactionList";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Clock,
  Filter,
  Download,
  Banknote,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState as useReactState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VendorWallet = () => {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const { balance, transactions, loading, transactionsLoading } = useWallet();
  const { user } = useAuth();
  const [pendingBalance, setPendingBalance] = useReactState(0);
  const [activeEscrowCount, setActiveEscrowCount] = useReactState(0);

  // Fetch pending escrow amounts for this vendor
  useEffect(() => {
    if (!user) return;

    const fetchPendingEscrows = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('vendor_id', user.id)
        .in('status', ['funded', 'in_progress', 'pending_release']);

      if (!error && data) {
        const total = data.reduce((sum, tx) => sum + Number(tx.amount), 0);
        setPendingBalance(total);
        setActiveEscrowCount(data.length);
      }
    };

    fetchPendingEscrows();
  }, [user]);

  const earnings = transactions.filter(t => t.type === 'escrow_release' || t.type === 'refund');
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');

  const totalEarnings = earnings.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">My Earnings</h1>
            <p className="text-muted-foreground">Track your earnings and withdrawals</p>
          </div>
          <Button onClick={() => setWithdrawModalOpen(true)} disabled={balance <= 50}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw Funds
          </Button>
        </div>

        {/* Wallet Card & Stats */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loading ? (
              <div className="h-48 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <WalletCard balance={balance} />
            )}
          </div>
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Release</p>
                  <p className="font-display font-bold text-lg">₦{pendingBalance.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">From active escrows</p>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="font-display font-bold text-lg">₦{totalEarnings.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </div>
        </div>

        {/* Pending Escrows Banner */}
        {activeEscrowCount > 0 && (
          <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">You have {activeEscrowCount} active escrow{activeEscrowCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Complete your tasks to receive ₦{pendingBalance.toLocaleString()}</p>
            </div>
            <Link to="/vendor/escrows">
              <Button variant="outline" size="sm">View Jobs</Button>
            </Link>
          </div>
        )}

        {/* Transaction History */}
        <div className="rounded-2xl bg-card border border-border shadow-soft">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-display font-semibold">Transaction History</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          <div className="p-6">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList className="mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <TransactionList transactions={transactions} />
                </TabsContent>
                <TabsContent value="earnings">
                  <TransactionList transactions={earnings} />
                </TabsContent>
                <TabsContent value="withdrawals">
                  <TransactionList transactions={withdrawals} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      <WithdrawModal 
        open={withdrawModalOpen} 
        onOpenChange={setWithdrawModalOpen} 
        availableBalance={balance}
      />
    </DashboardLayout>
  );
};

export default VendorWallet;
