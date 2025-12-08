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
import { Check, X, AlertTriangle, DollarSign, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type EscrowStatus = "pending" | "funded" | "in_progress" | "completed" | "released" | "disputed" | "cancelled";

interface EscrowActionsProps {
  status: EscrowStatus;
  userType: "client" | "vendor";
  onAction: (action: string) => void;
}

export function EscrowActions({ status, userType, onAction }: EscrowActionsProps) {
  const handleAction = (action: string) => {
    onAction(action);
    toast({
      title: "Action completed",
      description: `Transaction ${action} successfully.`,
    });
  };

  // Client actions
  if (userType === "client") {
    return (
      <div className="flex flex-wrap gap-3">
        {status === "pending" && (
          <Button onClick={() => handleAction("fund")} variant="default">
            <DollarSign className="h-4 w-4 mr-2" />
            Fund Escrow
          </Button>
        )}
        
        {status === "completed" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="success">
                <Check className="h-4 w-4 mr-2" />
                Release Funds
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Release Funds</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm that the vendor has completed the work satisfactorily. Once released, funds cannot be recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleAction("release")}>
                  Release Funds
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {(status === "funded" || status === "in_progress" || status === "completed") && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Raise Dispute
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Raise a Dispute</AlertDialogTitle>
                <AlertDialogDescription>
                  This will notify the vendor and our admin team. You'll be asked to provide details about the issue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleAction("dispute")}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {status === "pending" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
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
                <AlertDialogAction onClick={() => handleAction("cancel")}>
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
        <Button onClick={() => handleAction("start")} variant="default">
          <Play className="h-4 w-4 mr-2" />
          Start Work
        </Button>
      )}
      
      {status === "in_progress" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="success">
              <Check className="h-4 w-4 mr-2" />
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
              <AlertDialogAction onClick={() => handleAction("complete")}>
                Confirm Completion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {(status === "funded" || status === "in_progress") && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Raise Dispute
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Raise a Dispute</AlertDialogTitle>
              <AlertDialogDescription>
                This will notify the client and our admin team. You'll be asked to provide details about the issue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAction("dispute")}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
