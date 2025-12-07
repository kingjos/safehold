import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
}

const savedBanks = [
  { id: "1", bank: "GTBank", accountNumber: "0123456789", accountName: "John Doe" },
  { id: "2", bank: "Access Bank", accountNumber: "9876543210", accountName: "John Doe" },
];

export const WithdrawModal = ({ open, onOpenChange, availableBalance }: WithdrawModalProps) => {
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const { toast } = useToast();

  const selectedBankDetails = savedBanks.find(b => b.id === selectedBank);

  const handleContinue = () => {
    if (step === "form") {
      const numAmount = parseFloat(amount);
      if (!amount || numAmount < 1000) {
        toast({
          title: "Invalid amount",
          description: "Minimum withdrawal amount is ₦1,000",
          variant: "destructive",
        });
        return;
      }
      if (numAmount > availableBalance) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough funds for this withdrawal",
          variant: "destructive",
        });
        return;
      }
      if (!selectedBank) {
        toast({
          title: "Select bank account",
          description: "Please select a bank account to withdraw to",
          variant: "destructive",
        });
        return;
      }
      setStep("confirm");
    } else if (step === "confirm") {
      setStep("processing");
      setTimeout(() => {
        setStep("success");
      }, 2000);
    }
  };

  const handleClose = () => {
    setStep("form");
    setAmount("");
    setSelectedBank("");
    onOpenChange(false);
  };

  const fee = 50; // Fixed withdrawal fee
  const totalDeduction = parseFloat(amount || "0") + fee;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === "form" && "Withdraw Funds"}
            {step === "confirm" && "Confirm Withdrawal"}
            {step === "processing" && "Processing"}
            {step === "success" && "Withdrawal Initiated"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-accent/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className="font-display font-bold">₦{availableBalance.toLocaleString()}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount</Label>
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
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setAmount(String(availableBalance - fee))}
              >
                Withdraw all (₦{(availableBalance - fee).toLocaleString()})
              </button>
            </div>

            <div className="space-y-2">
              <Label>Select Bank Account</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a saved bank account" />
                </SelectTrigger>
                <SelectContent>
                  {savedBanks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{bank.bank} - {bank.accountNumber}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleContinue}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <div className="space-y-4 p-4 rounded-lg bg-accent/50">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">₦{parseFloat(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Fee</span>
                <span>₦{fee}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-medium">Total Deduction</span>
                <span className="font-display font-bold">₦{totalDeduction.toLocaleString()}</span>
              </div>
            </div>

            {selectedBankDetails && (
              <div className="p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Withdrawing to</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedBankDetails.bank}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBankDetails.accountNumber} - {selectedBankDetails.accountName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/10 text-sm">
              <AlertCircle className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                Withdrawals are typically processed within 24 hours during business days.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleContinue}>
                Confirm Withdrawal
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">Processing withdrawal...</p>
              <p className="text-sm text-muted-foreground">Please wait while we initiate your transfer</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <p className="text-xl font-display font-bold">Withdrawal Initiated!</p>
              <p className="text-muted-foreground">
                ₦{parseFloat(amount).toLocaleString()} will be credited to your account within 24 hours
              </p>
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
