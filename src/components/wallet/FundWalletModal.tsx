import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FundWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickAmounts = [5000, 10000, 25000, 50000, 100000, 250000];

export const FundWalletModal = ({ open, onOpenChange }: FundWalletModalProps) => {
  const [step, setStep] = useState<"amount" | "processing" | "success">("amount");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle payment callback
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const reference = searchParams.get("reference");
    
    if (paymentStatus === "success" && reference) {
      verifyPayment(reference);
      // Clean up URL params
      searchParams.delete("payment");
      searchParams.delete("reference");
      searchParams.delete("trxref");
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setIsLoading(true);
    setStep("processing");
    onOpenChange(true);

    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) throw error;

      if (data.success) {
        setStep("success");
        toast({
          title: "Payment successful",
          description: `₦${data.amount?.toLocaleString()} has been added to your wallet`,
        });
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Unable to verify payment",
        variant: "destructive",
      });
      setStep("amount");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayWithPaystack = async () => {
    if (!amount || parseFloat(amount) < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum deposit amount is ₦100",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { amount: parseFloat(amount) },
      });

      if (error) throw error;

      if (data.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || "Failed to initialize payment");
      }
    } catch (error) {
      toast({
        title: "Payment failed",
        description: error instanceof Error ? error.message : "Unable to initialize payment",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === "amount" && "Fund Your Wallet"}
            {step === "processing" && "Verifying Payment"}
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

            <div className="p-4 rounded-lg bg-accent/50">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-medium">Pay with Paystack</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Secure payment via card, bank transfer, or USSD
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handlePayWithPaystack}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  Pay with Paystack
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-medium">Verifying your payment...</p>
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
              <p className="text-muted-foreground">Your wallet has been funded</p>
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
