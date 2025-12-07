import { Wallet, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface WalletCardProps {
  balance: number;
  currency?: string;
}

export const WalletCard = ({ balance, currency = "₦" }: WalletCardProps) => {
  const [showBalance, setShowBalance] = useState(true);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground shadow-elevated">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Available Balance</p>
              <p className="text-xs opacity-60">SafeHold Wallet</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/20"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-4xl font-display font-bold tracking-tight">
            {showBalance ? `${currency}${balance.toLocaleString()}` : "••••••••"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm opacity-80">
          <div className="w-8 h-5 rounded bg-white/20" />
          <span>•••• 4521</span>
        </div>
      </div>
    </div>
  );
};
