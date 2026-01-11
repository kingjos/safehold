import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, X, AlertTriangle, DollarSign, Play, Loader2, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEscrowActions } from "@/hooks/useEscrowActions";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";

type EscrowStatus = "pending_funding" | "funded" | "in_progress" | "pending_release" | "completed" | "disputed" | "cancelled" | "refunded";

interface EscrowActionsProps {
  escrowId: string;
  status: EscrowStatus;
  amount: number;
  platformFee: number;
  userType: "client" | "vendor";
  onActionComplete?: () => void;
}

export function EscrowActions({ escrowId, status, amount, platformFee, userType, onActionComplete }: EscrowActionsProps) {
  const { fundEscrow, releaseEscrow, startWork, markComplete, cancelEscrow, loading } = useEscrowActions();
  const { balance } = useWallet();
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const totalRequired = amount + platformFee;
  const hasEnoughBalance = balance >= totalRequired;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleFund = async () => {
    const result = await fundEscrow(escrowId);
    if (result.success) {
      toast({
        title: "Escrow funded",
        description: "The escrow has been funded from your wallet.",
      });
      onActionComplete?.();
    } else {
      toast({
        title: "Failed to fund escrow",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
    setDialogOpen(null);
  };

  const handleRelease = async () => {
    const result = await releaseEscrow(escrowId);
    if (result.success) {
      toast({
        title: "Funds released",
        description: "Payment has been released to the vendor.",
      });
      onActionComplete?.();
    } else {
      toast({
        title: "Failed to release funds",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
    setDialogOpen(null);
  };

  const handleStartWork = async () => {
    const result = await startWork(escrowId);
    if (result.success) {
      toast({
        title: "Work started",
        description: "You have started working on this project.",
      });
      onActionComplete?.();
    } else {
      toast({
        title: "Failed to start work",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMarkComplete = async () => {
    const result = await markComplete(escrowId);
    if (result.success) {
      toast({
        title: "Marked as complete",
        description: "The client has been notified to review and release payment.",
      });
      onActionComplete?.();
    } else {
      toast({
        title: "Failed to mark complete",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
    setDialogOpen(null);
  };

  const handleCancel = async () => {
    const result = await cancelEscrow(escrowId);
    if (result.success) {
      toast({
        title: "Escrow cancelled",
        description: "The escrow has been cancelled.",
      });
      onActionComplete?.();
    } else {
      toast({
        title: "Failed to cancel escrow",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
    setDialogOpen(null);
  };

  // Client actions
  if (userType === "client") {
    return (
      <div className="flex flex-wrap gap-3">
        {status === "pending_funding" && (
          <AlertDialog open={dialogOpen === "fund"} onOpenChange={(open) => setDialogOpen(open ? "fund" : null)}>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wallet className="h-4 w-4 mr-2" />}
                Fund from Wallet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fund Escrow from Wallet</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>You are about to fund this escrow from your wallet balance.</p>
                  <div className="p-3 rounded-lg bg-muted space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Amount:</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Platform Fee:</span>
                      <span className="font-medium">{formatCurrency(platformFee)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatCurrency(totalRequired)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Your Wallet Balance:</span>
                    <span className={hasEnoughBalance ? "text-success font-medium" : "text-destructive font-medium"}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                  {!hasEnoughBalance && (
                    <p className="text-destructive text-sm">
                      Insufficient balance. Please fund your wallet first.
                    </p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleFund} disabled={!hasEnoughBalance || loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Fund Escrow
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {status === "pending_release" && (
          <AlertDialog open={dialogOpen === "release"} onOpenChange={(open) => setDialogOpen(open ? "release" : null)}>
            <AlertDialogTrigger asChild>
              <Button variant="success" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Release Funds
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Release Funds</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm that the vendor has completed the work satisfactorily. 
                  <span className="font-medium"> {formatCurrency(amount)}</span> will be released to the vendor. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRelease} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Release Funds
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {(status === "funded" || status === "in_progress" || status === "pending_release") && (
          <Button variant="destructive" disabled={loading}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Raise Dispute
          </Button>
        )}
        
        {status === "pending_funding" && (
          <AlertDialog open={dialogOpen === "cancel"} onOpenChange={(open) => setDialogOpen(open ? "cancel" : null)}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Transaction</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this escrow transaction? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Transaction</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel} disabled={loading}>
                  Cancel Transaction
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // Vendor actions
  return (
    <div className="flex flex-wrap gap-3">
      {status === "funded" && (
        <Button onClick={handleStartWork} variant="default" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Start Work
        </Button>
      )}
      
      {status === "in_progress" && (
        <AlertDialog open={dialogOpen === "complete"} onOpenChange={(open) => setDialogOpen(open ? "complete" : null)}>
          <AlertDialogTrigger asChild>
            <Button variant="success" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Mark as Completed
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Completed</AlertDialogTitle>
              <AlertDialogDescription>
                Confirm that you have completed all work as agreed. The client will be notified to review and release payment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkComplete} disabled={loading}>
                Confirm Completion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {(status === "funded" || status === "in_progress") && (
        <Button variant="destructive" disabled={loading}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Raise Dispute
        </Button>
      )}
    </div>
  );
}
