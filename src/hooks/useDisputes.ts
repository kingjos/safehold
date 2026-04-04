import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dispute } from "@/types/dispute";

const dbReasonToLabel: Record<string, string> = {
  service_not_delivered: "item_not_delivered",
  quality_issues: "work_quality_issues",
  late_delivery: "deadline_missed",
  payment_dispute: "payment_issues",
  communication_issues: "communication_breakdown",
  scope_disagreement: "scope_disagreement",
  other: "other",
};

export const useDisputes = (userType: "client" | "vendor") => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch disputes with their related transaction data
      const { data, error } = await supabase
        .from("disputes")
        .select("*, transactions(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data) {
        setDisputes([]);
        return;
      }

      // Fetch profiles for client/vendor names
      const userIds = new Set<string>();
      for (const d of data) {
        const tx = d.transactions as any;
        if (tx?.client_id) userIds.add(tx.client_id);
        if (tx?.vendor_id) userIds.add(tx.vendor_id);
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      const mapped: Dispute[] = data.map((d) => {
        const tx = d.transactions as any;
        const clientProfile = profileMap.get(tx?.client_id);
        const vendorProfile = profileMap.get(tx?.vendor_id);

        const isOpenedByClient = d.opened_by === tx?.client_id;

        // Calculate 48h response deadline from creation
        const createdDate = new Date(d.created_at);
        const deadline = new Date(createdDate.getTime() + 48 * 60 * 60 * 1000);

        return {
          id: d.id,
          escrowId: tx?.id || "",
          escrowTitle: tx?.title || "Unknown Transaction",
          amount: tx?.amount || 0,
          status: d.status,
          reason: dbReasonToLabel[d.reason] || d.reason,
          description: d.description,
          client: {
            name: clientProfile?.full_name || clientProfile?.email || "Unknown",
            email: clientProfile?.email || "",
          },
          vendor: {
            name: vendorProfile?.full_name || vendorProfile?.email || "Unknown",
            email: vendorProfile?.email || "",
          },
          openedBy: isOpenedByClient ? "client" : "vendor",
          openedAt: d.created_at,
          updatedAt: d.updated_at,
          respondByDeadline: deadline > new Date() ? deadline.toISOString() : undefined,
          timeline: [],
          vendorResponse: d.vendor_response || undefined,
        };
      });

      setDisputes(mapped);
    } catch (error) {
      console.error("Error fetching disputes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [userType]);

  return { disputes, loading, refetch: fetchDisputes };
};
