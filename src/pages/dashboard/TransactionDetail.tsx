import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Copy, User, Building, Calendar, DollarSign, FileText } from "lucide-react";
import { EscrowTimeline } from "@/components/escrow/EscrowTimeline";
import { EscrowStatusBadge } from "@/components/escrow/EscrowStatusBadge";
import { EscrowActions } from "@/components/escrow/EscrowActions";
import { toast } from "@/hooks/use-toast";

interface TransactionDetailProps {
  userType: "client" | "vendor";
}

// Mock data - would come from API
const mockTransaction = {
  id: "ESC-2024-001234",
  title: "Website Development Project",
  description: "Complete redesign and development of company website including responsive design, CMS integration, and SEO optimization. Deliverables include homepage, about page, services page, contact form, and blog section.",
  amount: 450000,
  fee: 4500,
  status: "in_progress" as const,
  createdAt: "2024-01-15",
  dueDate: "2024-02-15",
  client: {
    name: "John Adebayo",
    email: "john.adebayo@example.com",
  },
  vendor: {
    name: "TechCraft Solutions",
    email: "hello@techcraft.ng",
  },
  timeline: [
    {
      id: "1",
      type: "created" as const,
      title: "Escrow Created",
      description: "Transaction initiated by client",
      timestamp: "Jan 15, 2024 10:30 AM",
      actor: "John Adebayo",
    },
    {
      id: "2",
      type: "funded" as const,
      title: "Payment Secured",
      description: "₦450,000 deposited into escrow",
      timestamp: "Jan 15, 2024 11:45 AM",
      actor: "John Adebayo",
    },
    {
      id: "3",
      type: "in_progress" as const,
      title: "Work Started",
      description: "Vendor has begun working on the project",
      timestamp: "Jan 16, 2024 09:00 AM",
      actor: "TechCraft Solutions",
    },
  ],
};

export default function TransactionDetail({ userType }: TransactionDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const transaction = mockTransaction;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Transaction ID copied to clipboard",
    });
  };

  const handleAction = (action: string) => {
    console.log(`Action: ${action} for transaction ${id}`);
    // Handle the action - would call API
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

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
              <span className="text-sm text-muted-foreground">{transaction.id}</span>
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
                  <p className="text-foreground">{transaction.description}</p>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium text-foreground">{transaction.client.name}</p>
                      <p className="text-sm text-muted-foreground">{transaction.client.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-medium text-foreground">{transaction.vendor.name}</p>
                      <p className="text-sm text-muted-foreground">{transaction.vendor.email}</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium text-foreground">{transaction.createdAt}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-medium text-foreground">{transaction.dueDate}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <EscrowTimeline events={transaction.timeline} />
              </CardContent>
            </Card>
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
                  <span className="font-medium text-foreground">{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (1%)</span>
                  <span className="font-medium text-foreground">{formatCurrency(transaction.fee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(transaction.amount + transaction.fee)}
                  </span>
                </div>
                {userType === "vendor" && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You'll Receive</span>
                      <span className="font-bold text-success">{formatCurrency(transaction.amount)}</span>
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
                  status={transaction.status}
                  userType={userType}
                  onAction={handleAction}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
