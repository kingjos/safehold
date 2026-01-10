import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, CheckCircle, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBankAccounts } from "@/hooks/useBankAccounts";

const nigerianBanks = [
  "Access Bank",
  "First Bank of Nigeria",
  "GTBank",
  "UBA",
  "Zenith Bank",
  "Fidelity Bank",
  "Union Bank",
  "Sterling Bank",
  "Wema Bank",
  "Stanbic IBTC",
  "FCMB",
  "Polaris Bank",
  "Keystone Bank",
  "Ecobank",
  "Kuda Bank",
  "Opay",
  "Moniepoint",
];

export const BankAccountSettings = () => {
  const { toast } = useToast();
  const { accounts, loading, addAccount, setDefaultAccount, deleteAccount } = useBankAccounts();
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAccount, setNewAccount] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const handleAddAccount = async () => {
    if (!newAccount.bankName || !newAccount.accountNumber || !newAccount.accountName) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{10}$/.test(newAccount.accountNumber)) {
      toast({
        title: "Invalid account number",
        description: "Please enter a valid 10-digit account number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await addAccount(
      newAccount.bankName,
      newAccount.accountNumber,
      newAccount.accountName
    );
    setIsSubmitting(false);

    if (result.success) {
      setNewAccount({ bankName: "", accountNumber: "", accountName: "" });
      setIsAddingBank(false);
      toast({
        title: "Bank account added",
        description: "Your bank account has been added successfully.",
      });
    } else {
      toast({
        title: "Failed to add account",
        description: result.error || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultAccount(id);
    if (result.success) {
      toast({
        title: "Default account updated",
        description: "Your default bank account has been changed.",
      });
    } else {
      toast({
        title: "Failed to update",
        description: result.error || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAccount(id);
    if (result.success) {
      toast({
        title: "Bank account removed",
        description: "Your bank account has been removed.",
      });
    } else {
      toast({
        title: "Cannot delete account",
        description: result.error || "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Bank Accounts</h3>
          <p className="text-sm text-muted-foreground">Manage your bank accounts for withdrawals</p>
        </div>
        <Dialog open={isAddingBank} onOpenChange={setIsAddingBank}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Bank
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Select
                  value={newAccount.bankName}
                  onValueChange={(value) => setNewAccount({ ...newAccount, bankName: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  placeholder="Enter 10-digit account number"
                  value={newAccount.accountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewAccount({ ...newAccount, accountNumber: value });
                  }}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  placeholder="Account holder name"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value.slice(0, 100) })}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">Enter the name as it appears on your bank account</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddingBank(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddAccount} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Account"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No bank accounts added yet</p>
          <p className="text-sm text-muted-foreground">Add a bank account to receive withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`p-4 rounded-xl border transition-all ${
                account.is_default ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    account.is_default ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.bank_name}</p>
                      {account.is_default && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.account_number} • {account.account_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(account.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
