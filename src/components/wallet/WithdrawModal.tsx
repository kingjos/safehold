import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowRight, CheckCircle, AlertCircle, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";
import { useBankAccounts, BankAccount } from "@/hooks/useBankAccounts";
import { Link } from "react-router-dom";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
}

export const WithdrawModal = ({ open, onOpenChange, availableBalance }: WithdrawModalProps) => {
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form");
  const [amount, setAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { withdrawWallet } = useWallet();
  const { accounts, loading: accountsLoading } = useBankAccounts();

  // Auto-select default bank account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !selectedBankId) {
      const defaultAccount = accounts.find(a => a.is_default) || accounts[0];
      setSelectedBankId(defaultAccount.id);
    }
  }, [accounts, selectedBankId]);

  const selectedBankDetails = accounts.find(b => b.id === selectedBankId);

  const handleContinue = async () => {
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
      const fee = 50;
      if (numAmount + fee > availableBalance) {
        toast({
          title: "Insufficient balance",
          description: "You don't have enough funds for this withdrawal (including ₦50 fee)",
          variant: "destructive",
        });
        return;
      }
      if (!selectedBankId) {
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
      setIsLoading(true);

      const bankDetails = selectedBankDetails 
        ? `${selectedBankDetails.bank_name} - ${selectedBankDetails.account_number} - ${selectedBankDetails.account_name}` 
        : undefined;
      
      const result = await withdrawWallet(parseFloat(amount), bankDetails);
      
      setIsLoading(false);
      
      if (result.success) {
        setStep("success");
      } else {
        toast({
          title: "Withdrawal failed",
          description: result.error || "Unable to process withdrawal. Please try again.",
          variant: "destructive",
        });
        setStep("confirm");
      }
    }
  };

  const handleClose = () => {
    setStep("form");
    setAmount("");
    setSelectedBankId(accounts.find(a => a.is_default)?.id || accounts[0]?.id || "");
    setIsLoading(false);
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
              {availableBalance > fee && (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setAmount(String(availableBalance - fee))}
                >
                  Withdraw all (₦{(availableBalance - fee).toLocaleString()})
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Bank Account</Label>
              {accountsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-center">
                  <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No bank accounts saved</p>
                  <Link to="/dashboard/settings" onClick={() => onOpenChange(false)}>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Bank Account
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{bank.bank_name} - {bank.account_number}</span>
                          {bank.is_default && (
                            <span className="text-xs text-primary">(Default)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button 
              className="w-full" 
              onClick={handleContinue}
              disabled={accounts.length === 0}
            >
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
                    <p className="font-medium">{selectedBankDetails.bank_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedBankDetails.account_number} - {selectedBankDetails.account_name}
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
              <Button className="flex-1" onClick={handleContinue} disabled={isLoading}>
                {isLoading ? "Processing..." : "Confirm Withdrawal"}
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
