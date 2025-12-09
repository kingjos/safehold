import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisputeReason } from "@/types/dispute";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Upload } from "lucide-react";

interface CreateDisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escrowId: string;
  escrowTitle: string;
}

const reasonLabels: Record<DisputeReason, string> = {
  work_not_completed: "Work was not completed",
  work_quality_issues: "Quality of work is unsatisfactory",
  payment_issues: "Payment-related issues",
  communication_breakdown: "Communication breakdown",
  scope_disagreement: "Disagreement on project scope",
  deadline_missed: "Deadline was missed",
  other: "Other reason",
};

export const CreateDisputeModal = ({
  open,
  onOpenChange,
  escrowId,
  escrowTitle,
}: CreateDisputeModalProps) => {
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a reason and provide a description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: "Dispute opened",
      description: "Your dispute has been submitted and is pending review.",
    });
    
    setIsSubmitting(false);
    setReason("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Open a Dispute</DialogTitle>
              <DialogDescription>
                Escrow: {escrowId} - {escrowTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for dispute</Label>
            <Select value={reason} onValueChange={(val) => setReason(val as DisputeReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Describe the issue</Label>
            <Textarea
              id="description"
              placeholder="Please provide details about the dispute, including any relevant context, dates, and what resolution you're seeking..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Supporting evidence (optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, PNG, JPG up to 10MB
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning-foreground">
              <strong>Note:</strong> Opening a dispute will pause the escrow until it's resolved. 
              Our team will review your case within 24-48 hours.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Open Dispute"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
