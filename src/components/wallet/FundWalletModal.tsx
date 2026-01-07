import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Building2, Smartphone, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

interface FundWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = [
  { id: "card", label: "Debit Card", icon: CreditCard, description: "Visa, Mastercard, Verve" },
  { id: "bank", label: "Bank Transfer", icon: Building2, description: "Direct bank transfer" },
  { id: "ussd", label: "USSD", icon: Smartphone, description: "Pay with USSD code" },
];

const quickAmounts = [5000, 10000, 25000, 50000, 100000, 250000];

export const FundWalletModal = ({ open, onOpenChange }: FundWalletModalProps) => {
  const [step, setStep] = useState<"amount" | "method" | "processing" | "success">("amount");
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { fundWallet } = useWallet();

  const handleContinue = async () => {
    if (step === "amount") {
      if (!amount || parseFloat(amount) < 100) {
        toast({
          title: "Invalid amount",
          description: "Minimum deposit amount is ₦100",
          variant: "destructive",
        });
        return;
      }
      setStep("method");
    } else if (step === "method") {
      if (!selectedMethod) {
        toast({
          title: "Select payment method",
          description: "Please select a payment method to continue",
          variant: "destructive",
        });
        return;
      }
      
      setStep("processing");
      setIsLoading(true);
      
      // Generate a reference for this transaction
      const reference = `DEP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      
      // In a real implementation, this would integrate with a payment gateway
      // For now, we simulate payment processing and directly fund the wallet
      const result = await fundWallet(parseFloat(amount), reference);
      
      setIsLoading(false);
      
      if (result.success) {
        setStep("success");
      } else {
        toast({
          title: "Payment failed",
          description: result.error || "Unable to process payment. Please try again.",
          variant: "destructive",
        });
        setStep("method");
      }
    }
  };

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setSelectedMethod("");
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === "amount" && "Fund Your Wallet"}
            {step === "method" && "Select Payment Method"}
            {step === "processing" && "Processing Payment"}
            {step === "success" && "Payment Successful"}
          </DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">Enter Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quick Select</Label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={amount === String(amt) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAmount(String(amt))}
                  >
                    ₦{amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleContinue}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-accent/50 text-center">
              <p className="text-sm text-muted-foreground">Amount to fund</p>
              <p className="text-2xl font-display font-bold">₦{parseFloat(amount).toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    selectedMethod === method.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    selectedMethod === method.id ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}>
                    <method.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{method.label}</p>
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("amount")}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleContinue}>
                Pay Now
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-medium">Processing your payment...</p>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">Payment Successful!</p>
              <p className="text-muted-foreground">₦{parseFloat(amount).toLocaleString()} has been added to your wallet</p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
