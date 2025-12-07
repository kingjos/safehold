import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from "lucide-react";

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "escrow_fund" | "escrow_release";
  description: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  date: string;
  reference?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

const getTransactionIcon = (type: Transaction["type"]) => {
  switch (type) {
    case "deposit":
      return <ArrowDownLeft className="w-5 h-5 text-success" />;
    case "withdrawal":
    case "escrow_fund":
      return <ArrowUpRight className="w-5 h-5 text-destructive" />;
    case "escrow_release":
      return <ArrowDownLeft className="w-5 h-5 text-success" />;
  }
};

const getStatusIcon = (status: Transaction["status"]) => {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4 text-secondary" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-success" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-destructive" />;
  }
};

const getAmountColor = (type: Transaction["type"]) => {
  return type === "deposit" || type === "escrow_release" ? "text-success" : "text-destructive";
};

const getAmountPrefix = (type: Transaction["type"]) => {
  return type === "deposit" || type === "escrow_release" ? "+" : "-";
};

export const TransactionList = ({ transactions }: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-4 rounded-xl bg-background hover:bg-accent/50 transition-colors border border-transparent hover:border-border"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              {getTransactionIcon(tx.type)}
            </div>
            <div>
              <p className="font-medium">{tx.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{new Date(tx.date).toLocaleDateString("en-NG", { 
                  day: "numeric", 
                  month: "short", 
                  year: "numeric" 
                })}</span>
                {tx.reference && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-xs">{tx.reference}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${getAmountColor(tx.type)}`}>
              {getAmountPrefix(tx.type)}₦{tx.amount.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
              {getStatusIcon(tx.status)}
              <span className="capitalize">{tx.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
