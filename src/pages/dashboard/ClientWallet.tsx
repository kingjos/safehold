import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionList } from "@/components/wallet/TransactionList";
import { FundWalletModal } from "@/components/wallet/FundWalletModal";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Download,
  Loader2
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

const ClientWallet = () => {
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  
  const { balance, transactions, deposits, outflows, loading, transactionsLoading } = useWallet();

  const totalDeposits = deposits.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalOutflows = outflows.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">My Wallet</h1>
            <p className="text-muted-foreground">Manage your funds and transactions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setWithdrawModalOpen(true)} disabled={balance <= 50}>
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
            <Button onClick={() => setFundModalOpen(true)}>
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Fund Wallet
            </Button>
          </div>
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
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="font-display font-bold text-lg">₦{totalDeposits.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Outflows</p>
                  <p className="font-display font-bold text-lg">₦{totalOutflows.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
          </div>
        </div>

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
                  <TabsTrigger value="deposits">Deposits</TabsTrigger>
                  <TabsTrigger value="outflows">Outflows</TabsTrigger>
                </TabsList>
                <TabsContent value="all">
                  <TransactionList transactions={transactions} />
                </TabsContent>
                <TabsContent value="deposits">
                  <TransactionList transactions={deposits} />
                </TabsContent>
                <TabsContent value="outflows">
                  <TransactionList transactions={outflows} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>

      <FundWalletModal open={fundModalOpen} onOpenChange={setFundModalOpen} />
      <WithdrawModal 
        open={withdrawModalOpen} 
        onOpenChange={setWithdrawModalOpen} 
        availableBalance={balance}
      />
    </DashboardLayout>
  );
};

export default ClientWallet;
