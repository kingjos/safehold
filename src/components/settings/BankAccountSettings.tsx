import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, CheckCircle, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

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
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [accounts, setAccounts] = useState<BankAccount[]>([
    { id: "1", bankName: "GTBank", accountNumber: "0123456789", accountName: "John Doe", isDefault: true },
    { id: "2", bankName: "Access Bank", accountNumber: "9876543210", accountName: "John Doe", isDefault: false },
  ]);

  const [newAccount, setNewAccount] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  const handleAddAccount = () => {
    if (!newAccount.bankName || !newAccount.accountNumber || !newAccount.accountName) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const account: BankAccount = {
      id: Date.now().toString(),
      ...newAccount,
      isDefault: accounts.length === 0,
    };

    setAccounts([...accounts, account]);
    setNewAccount({ bankName: "", accountNumber: "", accountName: "" });
    setIsAddingBank(false);
    toast({
      title: "Bank account added",
      description: "Your bank account has been added successfully.",
    });
  };

  const handleSetDefault = (id: string) => {
    setAccounts(accounts.map(acc => ({
      ...acc,
      isDefault: acc.id === id,
    })));
    toast({
      title: "Default account updated",
      description: "Your default bank account has been changed.",
    });
  };

  const handleDelete = (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (account?.isDefault && accounts.length > 1) {
      toast({
        title: "Cannot delete default account",
        description: "Please set another account as default first.",
        variant: "destructive",
      });
      return;
    }
    setAccounts(accounts.filter(acc => acc.id !== id));
    toast({
      title: "Bank account removed",
      description: "Your bank account has been removed.",
    });
  };

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
                  onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  placeholder="Account holder name"
                  value={newAccount.accountName}
                  onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">This will be verified automatically</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddingBank(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddAccount}>
                  Add Account
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
                account.isDefault ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    account.isDefault ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.bankName}</p>
                      {account.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.accountNumber} • {account.accountName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.isDefault && (
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
