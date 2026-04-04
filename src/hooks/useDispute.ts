import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DisputeReason } from "@/types/dispute";
import type { Database } from "@/integrations/supabase/types";

type DbDisputeReason = Database["public"]["Enums"]["dispute_reason"];

const reasonToDbReason: Record<DisputeReason, DbDisputeReason> = {
  item_not_delivered: "service_not_delivered",
  item_not_as_described: "quality_issues",
  damaged_item: "quality_issues",
  wrong_item: "quality_issues",
  work_not_completed: "service_not_delivered",
  work_quality_issues: "quality_issues",
  payment_issues: "payment_dispute",
  communication_breakdown: "communication_issues",
  scope_disagreement: "scope_disagreement",
  deadline_missed: "late_delivery",
  other: "other",
};

interface CreateDisputeData {
  transactionId: string;
  reason: DisputeReason;
  description: string;
  files: File[];
}

interface VendorResponseData {
  disputeId: string;
  responseText: string;
  files: File[];
}

export const useDispute = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createDispute = async ({ transactionId, reason, description, files }: CreateDisputeData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dbReason = reasonToDbReason[reason];

      // Insert dispute
      const { data: dispute, error: disputeError } = await supabase
        .from("disputes")
        .insert({
          transaction_id: transactionId,
          opened_by: user.id,
          reason: dbReason,
          description,
        })
        .select()
        .single();

      if (disputeError) throw disputeError;

      // Upload evidence files
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${dispute.id}/${crypto.randomUUID()}.${fileExt}`;

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

        await supabase.from("dispute_evidence").insert({
          dispute_id: dispute.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith("image/") ? "image" : "document",
        });
      }

      // Update transaction status to disputed
      const { error: txError } = await supabase
        .from("transactions")
        .update({ status: "disputed" as any })
        .eq("id", transactionId);

      if (txError) throw txError;

      // Add dispute event
      await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        user_id: user.id,
        event_type: "opened",
        description: `Dispute opened: ${description.slice(0, 100)}`,
      });

      // Add transaction event
      await supabase.from("transaction_events").insert({
        transaction_id: transactionId,
        user_id: user.id,
        event_type: "disputed",
        description: "A dispute was raised on this transaction",
      });

      return { success: true };
    } catch (error: any) {
      console.error("Create dispute error:", error);
      toast({
        title: "Failed to create dispute",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };


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
