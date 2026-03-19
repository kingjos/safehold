import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, CheckCircle, XCircle, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  description: string;
  transfer_reference: string | null;
  reference: string | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; badgeClass: string }> = {
  pending: {
    icon: <Clock className="w-4 h-4" />,
    label: "Processing",
    color: "text-secondary",
    badgeClass: "bg-secondary/10 text-secondary border-secondary/20",
  },
  completed: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: "Completed",
    color: "text-success",
    badgeClass: "bg-success/10 text-success border-success/20",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    label: "Failed",
    color: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export const WithdrawalTracker = () => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWithdrawals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("wallet_transactions")
      .select("id, amount, status, created_at, description, transfer_reference, reference")
      .eq("user_id", user.id)
      .eq("type", "withdrawal")
      .order("created_at", { ascending: false })
      .limit(10);

    setWithdrawals((data as Withdrawal[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [user]);

  // Realtime subscription for withdrawal status changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("withdrawal-tracker")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallet_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchWithdrawals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border shadow-soft p-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (withdrawals.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display font-semibold">Withdrawal Status</h3>
          {pendingCount > 0 && (
            <Badge className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
              {pendingCount} processing
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={fetchWithdrawals} className="h-8 w-8">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <div className="divide-y divide-border">
        {withdrawals.map((w) => {
          const config = statusConfig[w.status] || statusConfig.pending;
          return (
            <div key={w.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                  w.status === "pending" && "bg-secondary/10",
                  w.status === "completed" && "bg-success/10",
                  w.status === "failed" && "bg-destructive/10"
                )}>
                  <ArrowUpRight className={cn("w-4 h-4", config.color)} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">₦{Number(w.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {w.status === "pending" && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                )}
                <Badge variant="outline" className={cn("text-xs", config.badgeClass)}>
                  {config.icon}
                  <span className="ml-1">{config.label}</span>
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
