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
import { AlertTriangle } from "lucide-react";
import { EvidenceUpload } from "./EvidenceUpload";
import { AlertBox } from "./AlertBox";
import { useDispute } from "@/hooks/useDispute";

interface CreateDisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escrowId: string;
  escrowTitle: string;
  onSuccess?: () => void;
}

const reasonLabels: Record<DisputeReason, string> = {
  item_not_delivered: "Item not delivered",
  item_not_as_described: "Item not as described",
  damaged_item: "Damaged item",
  wrong_item: "Wrong item",
  work_not_completed: "Work was not completed",
  work_quality_issues: "Quality of work is unsatisfactory",
  payment_issues: "Payment-related issues",
  communication_breakdown: "Communication breakdown",
  scope_disagreement: "Disagreement on project scope",
  deadline_missed: "Deadline was missed",
  other: "Other reason",
};

const MAX_DESC = 200;

export const CreateDisputeModal = ({
  open,
  onOpenChange,
  escrowId,
  escrowTitle,
  onSuccess,
}: CreateDisputeModalProps) => {
  const [reason, setReason] = useState<DisputeReason | "">("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const { createDispute, isSubmitting } = useDispute();

  const canSubmit = reason && description.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const result = await createDispute({
      transactionId: escrowId,
      reason: reason as DisputeReason,
      description,
      files: rawFiles,
    });

    if (result.success) {
      setSubmitted(true);
      toast({
        title: "Dispute submitted",
        description: "Funds are now held while we review your case.",
      });
    }
  };

  const handleClose = () => {
    if (submitted) {
      onSuccess?.();
    }
    setReason("");
    setDescription("");
    setFiles([]);
    setSubmitted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold">Dispute submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Funds are now held while we review both sides of the dispute.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Raise a Dispute</DialogTitle>
                  <DialogDescription>
                    {escrowId} — {escrowTitle}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reason">Select Reason</Label>
                <Select value={reason} onValueChange={(val) => setReason(val as DisputeReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reasonLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe the issue</Label>
                <Textarea
                  id="description"
                  placeholder="Submit clear evidence to support your claim..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/{MAX_DESC} characters
                </p>
              </div>

              <div className="space-y-2">
                <Label>Upload Evidence</Label>
                <EvidenceUpload onFilesChange={setFiles} />
              </div>

              <AlertBox variant="warning">
                Submitting a dispute will pause this transaction while we review both sides.
              </AlertBox>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isSubmitting ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
