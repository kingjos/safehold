import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertBox } from "./AlertBox";
import { EvidenceUpload } from "./EvidenceUpload";
import { useDispute } from "@/hooks/useDispute";
import { MessageSquare, CheckCircle2 } from "lucide-react";

interface VendorResponseFormProps {
  disputeId: string;
  onSuccess?: () => void;
}

export const VendorResponseForm = ({ disputeId, onSuccess }: VendorResponseFormProps) => {
  const [responseText, setResponseText] = useState("");
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const { submitVendorResponse, isSubmitting } = useDispute();

  const handleSubmit = async () => {
    if (!responseText.trim()) return;

    const result = await submitVendorResponse({
      disputeId,
      responseText,
      files: rawFiles,
    });

    if (result.success) {
      setSubmitted(true);
      onSuccess?.();
    }
  };

  if (submitted) {
    return (
      <div className="py-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-success" />
        </div>
        <div>
          <h3 className="font-display font-semibold">Response Submitted</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your response has been recorded. The dispute is now under review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertBox variant="warning">
        Failure to respond may result in automatic decision in buyer's favor.
      </AlertBox>
      <div className="space-y-2">
        <Label>Your Explanation</Label>
        <Textarea
          placeholder="Provide your side of the story with clear details..."
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>Upload Proof (waybill, delivery image, etc.)</Label>
        <EvidenceUpload onRawFilesChange={setRawFiles} />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!responseText.trim() || isSubmitting}
        className="w-full"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        {isSubmitting ? "Submitting..." : "Submit Response"}
      </Button>
    </div>
  );
};
