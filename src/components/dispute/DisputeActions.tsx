import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisputeStatus } from "@/types/dispute";
import { MessageSquare, Upload, CheckCircle2, XCircle, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface DisputeActionsProps {
  status: DisputeStatus;
  userType: "client" | "vendor" | "admin";
  onAction: (action: string, data?: any) => void;
}

export const DisputeActions = ({ status, userType, onAction }: DisputeActionsProps) => {
  const [responseText, setResponseText] = useState("");
  const [resolution, setResolution] = useState("");

  const handleResponse = () => {
    if (!responseText.trim()) {
      toast({
        title: "Empty response",
        description: "Please enter a response message.",
        variant: "destructive",
      });
      return;
    }
    onAction("respond", { message: responseText });
    setResponseText("");
    toast({
      title: "Response sent",
      description: "Your response has been added to the dispute.",
    });
  };

  const handleResolve = () => {
    if (!resolution) {
      toast({
        title: "Select resolution",
        description: "Please select a resolution type.",
        variant: "destructive",
      });
      return;
    }
    onAction("resolve", { resolution });
    toast({
      title: "Dispute resolved",
      description: "The dispute has been marked as resolved.",
    });
  };

  // Client/Vendor actions
  if (userType !== "admin") {
    if (status === "closed" || status === "resolved_client" || status === "resolved_vendor") {
      return (
        <div className="p-4 rounded-lg bg-muted text-center">
          <p className="text-sm text-muted-foreground">
            This dispute has been resolved and no further actions are available.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="font-semibold">Add Response</h3>
        <Textarea
          placeholder="Provide additional information or respond to the dispute..."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={4}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload Evidence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Evidence</DialogTitle>
                <DialogDescription>
                  Add supporting documents or screenshots for your case.
                </DialogDescription>
              </DialogHeader>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drag & drop files or click to browse
                </p>
              </div>
              <Button onClick={() => toast({ title: "Files uploaded" })}>
                Upload Files
              </Button>
            </DialogContent>
          </Dialog>
          <Button onClick={handleResponse} className="flex-1">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Response
          </Button>
        </div>
      </div>
    );
  }

  // Admin actions
  if (status === "closed" || status === "resolved_client" || status === "resolved_vendor") {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <p className="text-sm text-success-foreground">
            This dispute has been resolved.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Reopen Dispute
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reopen this dispute?</AlertDialogTitle>
              <AlertDialogDescription>
                This will change the status back to "Under Investigation" and notify both parties.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onAction("reopen")}>
                Reopen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Response */}
      <div className="space-y-3">
        <h3 className="font-semibold">Admin Response</h3>
        <Textarea
          placeholder="Send a message to both parties..."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={3}
        />
        <Button onClick={handleResponse} className="w-full">
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>

      {/* Resolution Actions */}
      <div className="space-y-3">
        <h3 className="font-semibold">Resolve Dispute</h3>
        <div className="space-y-2">
          <Label>Resolution type</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger>
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="refund_client">
                Full refund to client
              </SelectItem>
              <SelectItem value="pay_vendor">
                Release funds to vendor
              </SelectItem>
              <SelectItem value="split">
                Split funds between parties
              </SelectItem>
              <SelectItem value="mutual_agreement">
                Mutual agreement reached
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Resolve
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm resolution?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will resolve the dispute and release funds according to your selected resolution. 
                  Both parties will be notified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResolve}>
                  Confirm Resolution
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <XCircle className="w-4 h-4 mr-2" />
                Close
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close without resolution?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will close the dispute without releasing funds. Use this only if both parties 
                  have resolved the issue outside the platform.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onAction("close")}>
                  Close Dispute
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Escalation */}
      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-warning mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">Escalate to Legal</p>
            <p className="text-xs text-muted-foreground mt-1">
              If this dispute requires legal intervention, escalate it to the legal team.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onAction("escalate")}>
              Escalate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
