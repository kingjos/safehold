import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { WalletCard } from "@/components/wallet/WalletCard";
import { TransactionList, Transaction } from "@/components/wallet/TransactionList";
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
  Download
} from "lucide-react";

const mockTransactions: Transaction[] = [
  {
    id: "TXN-001",
    type: "deposit",
    description: "Wallet Funding",
    amount: 500000,
    status: "completed",
    date: "2024-01-15",
    reference: "PAY-ABC123"
  },
  {
    id: "TXN-002",
    type: "escrow_fund",
    description: "Escrow: Website Development",
    amount: 350000,
    status: "completed",
    date: "2024-01-14",
    reference: "ESC-001"
  },
  {
    id: "TXN-003",
    type: "deposit",
    description: "Wallet Funding",
    amount: 100000,
    status: "completed",
    date: "2024-01-12",
    reference: "PAY-DEF456"
  },
  {
    id: "TXN-004",
    type: "escrow_fund",
    description: "Escrow: Logo Design",
    amount: 75000,
    status: "completed",
    date: "2024-01-10",
    reference: "ESC-002"
  },
  {
    id: "TXN-005",
    type: "withdrawal",
    description: "Bank Withdrawal",
    amount: 200000,
    status: "pending",
    date: "2024-01-08",
    reference: "WTH-789"
  },
  {
    id: "TXN-006",
    type: "deposit",
    description: "Wallet Funding",
    amount: 250000,
    status: "completed",
    date: "2024-01-05",
    reference: "PAY-GHI789"
  }
];

const ClientWallet = () => {
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const walletBalance = 2450000;

  const deposits = mockTransactions.filter(t => t.type === "deposit" || t.type === "escrow_release");
  const outflows = mockTransactions.filter(t => t.type === "withdrawal" || t.type === "escrow_fund");

  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalOutflows = outflows.reduce((sum, t) => sum + t.amount, 0);

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
            <Button variant="outline" onClick={() => setWithdrawModalOpen(true)}>
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
            <WalletCard balance={walletBalance} />
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
              <p className="text-xs text-muted-foreground">This month</p>
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
              <p className="text-xs text-muted-foreground">This month</p>
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
            <Tabs defaultValue="all">
              <TabsList className="mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="outflows">Outflows</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <TransactionList transactions={mockTransactions} />
              </TabsContent>
              <TabsContent value="deposits">
                <TransactionList transactions={deposits} />
              </TabsContent>
              <TabsContent value="outflows">
                <TransactionList transactions={outflows} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <FundWalletModal open={fundModalOpen} onOpenChange={setFundModalOpen} />
      <WithdrawModal 
        open={withdrawModalOpen} 
        onOpenChange={setWithdrawModalOpen} 
        availableBalance={walletBalance}
      />
    </DashboardLayout>
  );
};

export default ClientWallet;
