import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft,
  Search,
  User,
  FileText,
  Calendar,
  Wallet,
  Shield,
  CheckCircle2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const CreateEscrow = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vendorEmail: "",
    title: "",
    description: "",
    amount: "",
    deadline: "",
    milestones: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [createdEscrowId, setCreatedEscrowId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an escrow.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const amount = parseFloat(formData.amount);
      const platformFee = amount * 0.015;

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          amount: amount,
          platform_fee: platformFee,
          vendor_email: formData.vendorEmail,
          due_date: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          status: 'pending_funding'
        })
        .select()
        .single();

      if (error) throw error;

      setCreatedEscrowId(data.id);
      toast({
        title: "Escrow created successfully!",
        description: "The vendor has been notified about the secured payment.",
      });
      setStep(4);
    } catch (error: any) {
      toast({
        title: "Error creating escrow",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold">Create New Escrow</h1>
            <p className="text-muted-foreground">Secure your transaction with SafeHold</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: "Vendor", icon: User },
              { num: 2, label: "Details", icon: FileText },
              { num: 3, label: "Payment", icon: Wallet },
              { num: 4, label: "Complete", icon: CheckCircle2 }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className="hidden sm:inline font-medium">{s.label}</span>
                </div>
                {i < 3 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-2 ${step > s.num ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          {step === 1 && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft animate-slide-up">
              <h2 className="text-lg font-display font-semibold mb-4">Select Vendor</h2>
              <p className="text-muted-foreground mb-6">Enter the email address of the vendor you want to work with.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorEmail">Vendor Email</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="vendorEmail"
                      type="email"
                      placeholder="vendor@example.com"
                      className="pl-10"
                      value={formData.vendorEmail}
                      onChange={(e) => setFormData({...formData, vendorEmail: e.target.value})}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-accent/50 border border-accent">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Verified Vendors Only</p>
                      <p className="text-sm text-muted-foreground">All vendors on SafeHold are verified for your security.</p>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={!formData.vendorEmail}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft animate-slide-up">
              <h2 className="text-lg font-display font-semibold mb-4">Transaction Details</h2>
              <p className="text-muted-foreground mb-6">Describe the work or service being provided.</p>
              
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Website Development"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the scope of work, deliverables, and any specific requirements..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Expected Deadline</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="deadline"
                      type="date"
                      className="pl-10"
                      value={formData.deadline}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    size="lg"
                    onClick={() => setStep(3)}
                    disabled={!formData.title || !formData.description}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 rounded-2xl bg-card border border-border shadow-soft animate-slide-up">
              <h2 className="text-lg font-display font-semibold mb-4">Payment Details</h2>
              <p className="text-muted-foreground mb-6">Set the escrow amount to be secured.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Escrow Amount (₦)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-lg font-semibold"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-muted space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Escrow Amount</span>
                    <span className="font-medium">₦{Number(formData.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service Fee (1.5%)</span>
                    <span className="font-medium">₦{(Number(formData.amount || 0) * 0.015).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-display font-bold text-lg">
                        ₦{(Number(formData.amount || 0) * 1.015).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="lg" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1" 
                    size="lg"
                    disabled={!formData.amount || isLoading}
                  >
                    {isLoading ? "Creating Escrow..." : "Create & Fund Escrow"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 4 && (
            <div className="p-8 rounded-2xl bg-card border border-border shadow-soft text-center animate-slide-up">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">Escrow Created!</h2>
              <p className="text-muted-foreground mb-6">
                Your funds are now secured. The vendor has been notified and can begin work.
              </p>
              
              <div className="p-4 rounded-xl bg-muted mb-6 text-left">
                <p className="text-sm text-muted-foreground mb-1">Escrow ID</p>
                <p className="font-mono font-semibold text-sm break-all">{createdEscrowId || 'N/A'}</p>
              </div>

              <div className="flex gap-3">
                <Link to="/dashboard/escrows" className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">
                    View My Escrows
                  </Button>
                </Link>
                <Link to="/dashboard" className="flex-1">
                  <Button size="lg" className="w-full">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateEscrow;
