import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VendorResponseData {
  disputeId: string;
  responseText: string;
  files: File[];
}

export const useDispute = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitVendorResponse = async ({ disputeId, responseText, files }: VendorResponseData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload evidence files to storage
      const uploadedEvidence: { file_name: string; file_url: string; file_type: string }[] = [];

      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${disputeId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("dispute-evidence")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("dispute-evidence")
          .getPublicUrl(filePath);

        uploadedEvidence.push({
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith("image/") ? "image" : "document",
        });
      }

      // Update dispute with vendor response and change status
      const { error: updateError } = await supabase
        .from("disputes")
        .update({
          vendor_response: responseText,
          status: "under_review" as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", disputeId);

      if (updateError) throw updateError;

      // Insert evidence records
      if (uploadedEvidence.length > 0) {
        const { error: evidenceError } = await supabase
          .from("dispute_evidence" as any)
          .insert(
            uploadedEvidence.map((e) => ({
              dispute_id: disputeId,
              uploaded_by: user.id,
              file_name: e.file_name,
              file_url: e.file_url,
              file_type: e.file_type,
            }))
          );

        if (evidenceError) {
          console.error("Evidence insert error:", evidenceError);
        }
      }

      // Add timeline event
      const { error: eventError } = await supabase
        .from("dispute_events")
        .insert({
          dispute_id: disputeId,
          user_id: user.id,
          event_type: "response",
          description: `Vendor responded to the dispute${uploadedEvidence.length > 0 ? ` and uploaded ${uploadedEvidence.length} evidence file(s)` : ""}.`,
        });

      if (eventError) {
        console.error("Event insert error:", eventError);
      }

      toast({
        title: "Response submitted",
        description: "Your response and evidence have been recorded. Status changed to Under Review.",
      });

      return { success: true };
    } catch (error: any) {
      console.error("Submit vendor response error:", error);
      toast({
        title: "Failed to submit response",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitVendorResponse, isSubmitting };
};
