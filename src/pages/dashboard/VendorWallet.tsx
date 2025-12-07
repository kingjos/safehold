import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionList, Transaction } from "@/components/wallet/TransactionList";
import { WithdrawModal } from "@/components/wallet/WithdrawModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpRight, 
  TrendingUp, 
  Clock,
  Filter,
  Download,
  Banknote
} from "lucide-react";

const mockTransactions: Transaction[] = [
  {
    id: "TXN-V001",
    type: "escrow_release",
    description: "Escrow Release: Logo Design",
    amount: 75000,
    status: "completed",
    date: "2024-01-15",
    reference: "ESC-002"
  },
  {
    id: "TXN-V002",
    type: "withdrawal",
    description: "Bank Withdrawal",
    amount: 150000,
    status: "completed",
    date: "2024-01-14",
    reference: "WTH-V001"
  },
  {
    id: "TXN-V003",
    type: "escrow_release",
    description: "Escrow Release: Content Writing",
    amount: 45000,
    status: "completed",
    date: "2024-01-12",
    reference: "ESC-003"
  },
  {
    id: "TXN-V004",
    type: "escrow_release",
    description: "Escrow Release: Social Media Graphics",
    amount: 30000,
    status: "completed",
    date: "2024-01-10",
    reference: "ESC-004"
  },
  {
    id: "TXN-V005",
    type: "withdrawal",
    description: "Bank Withdrawal",
    amount: 100000,
    status: "pending",
    date: "2024-01-08",
    reference: "WTH-V002"
  },
  {
    id: "TXN-V006",
    type: "escrow_release",
    description: "Escrow Release: Video Editing",
    amount: 120000,
    status: "completed",
    date: "2024-01-05",
    reference: "ESC-005"
  }
];

const VendorWallet = () => {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const availableBalance = 520000;
  const pendingBalance = 350000;

  const earnings = mockTransactions.filter(t => t.type === "escrow_release");
  const withdrawals = mockTransactions.filter(t => t.type === "withdrawal");

  const totalEarnings = earnings.reduce((sum, t) => sum + t.amount, 0);

  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">My Earnings</h1>
            <p className="text-muted-foreground">Track your earnings and withdrawals</p>
          </div>
          <Button onClick={() => setWithdrawModalOpen(true)}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Withdraw Funds
          </Button>
        </div>

        {/* Wallet Card & Stats */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WalletCard balance={availableBalance} />
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
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
          </div>
        </div>

        {/* Pending Escrows Banner */}
        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">You have 2 active escrows</p>
            <p className="text-sm text-muted-foreground">Complete your tasks to receive ₦{pendingBalance.toLocaleString()}</p>
          </div>
          <Button variant="outline" size="sm">View Jobs</Button>
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
            <Tabs defaultValue="all">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <TransactionList transactions={mockTransactions} />
              </TabsContent>
              <TabsContent value="earnings">
                <TransactionList transactions={earnings} />
              </TabsContent>
              <TabsContent value="withdrawals">
                <TransactionList transactions={withdrawals} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <WithdrawModal 
        open={withdrawModalOpen} 
        onOpenChange={setWithdrawModalOpen} 
        availableBalance={availableBalance}
      />
    </DashboardLayout>
  );
};

export default VendorWallet;
