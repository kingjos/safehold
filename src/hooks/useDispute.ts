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

      // SECURITY DEFINER RPC: creates dispute, flips transaction.status to 'disputed',
      // logs dispute + transaction events, and notifies the counterparty.
      const { data: dispute, error: rpcError } = await supabase.rpc("create_dispute", {
        p_transaction_id: transactionId,
        p_reason: dbReason,
        p_description: description,
      });

      if (rpcError) throw rpcError;
      const disputeId = (dispute as any)?.id;
      if (!disputeId) throw new Error("Failed to create dispute");

      // Upload evidence files (dispute_evidence inserts are still allowed via RLS)
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

        await supabase.from("dispute_evidence").insert({
          dispute_id: disputeId,
          uploaded_by: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type.startsWith("image/") ? "image" : "document",
        });
      }

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

      // Insert evidence records (allowed by dispute_evidence RLS)
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

      // SECURITY DEFINER RPC: updates only vendor_response + status, and logs the event.
      const { error: rpcError } = await supabase.rpc("vendor_submit_dispute_response", {
        p_dispute_id: disputeId,
        p_response: responseText,
        p_evidence_count: uploadedEvidence.length,
      });

      if (rpcError) throw rpcError;

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

  return { createDispute, submitVendorResponse, isSubmitting };
};
