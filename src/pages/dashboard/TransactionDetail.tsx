import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, User, Building, Calendar, DollarSign, FileText, Loader2 } from "lucide-react";
import { EscrowTimeline } from "@/components/escrow/EscrowTimeline";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { EscrowActions } from "@/components/escrow/EscrowActions";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

interface TransactionDetailProps {
  userType: "client" | "vendor";
}

type Transaction = Tables<'transactions'>;
type TransactionEvent = Tables<'transaction_events'>;

interface CounterpartyProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_client: boolean;
}

export default function TransactionDetail({ userType }: TransactionDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [counterparty, setCounterparty] = useState<CounterpartyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTransaction = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction details",
        variant: "destructive"
      });
    }
  };

  const fetchEvents = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('transaction_events')
        .select('*')
        .eq('transaction_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCounterparty = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_transaction_counterparty_profile', { transaction_id: id });

      if (error) throw error;
      if (data && data.length > 0) {
        setCounterparty(data[0]);
      }
    } catch (error) {
      console.error('Error fetching counterparty:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTransaction(), fetchEvents(), fetchCounterparty()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleActionComplete = () => {
    fetchTransaction();
    fetchEvents();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const mapEventsToTimeline = () => {
    return events.map(event => ({
      id: event.id,
      type: event.event_type as "created" | "funded" | "in_progress" | "completed" | "disputed" | "cancelled",
      title: event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1).replace('_', ' '),
      description: event.description,
      timestamp: formatDate(event.created_at),
      actor: userType === "client" ? "You" : counterparty?.full_name || "Client"
    }));
  };

  if (loading) {
    return (
      <DashboardLayout userType={userType}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!transaction) {
    return (
      <DashboardLayout userType={userType}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Transaction not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{transaction.title}</h1>
              <EscrowStatusBadge status={transaction.status} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{transaction.id.slice(0, 8)}...</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(transaction.id)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-foreground">{transaction.description || "No description provided"}</p>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {userType === "client" ? "Vendor" : "Client"}
                      </p>
                      <p className="font-medium text-foreground">
                        {counterparty?.full_name || transaction.vendor_email || "Not assigned"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium text-foreground">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                </div>
                
                {transaction.due_date && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium text-foreground">{formatDate(transaction.due_date)}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            {events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <EscrowTimeline events={mapEventsToTimeline()} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escrow Amount</span>
                  <span className="font-medium text-foreground">{formatCurrency(Number(transaction.amount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium text-foreground">{formatCurrency(Number(transaction.platform_fee))}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(Number(transaction.amount) + Number(transaction.platform_fee))}
                  </span>
                </div>
                {userType === "vendor" && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You'll Receive</span>
                      <span className="font-bold text-success">{formatCurrency(Number(transaction.amount))}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <EscrowActions
                  escrowId={transaction.id}
                  status={transaction.status}
                  amount={Number(transaction.amount)}
                  platformFee={Number(transaction.platform_fee)}
                  userType={userType}
                  onActionComplete={handleActionComplete}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
