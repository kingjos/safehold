import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AdminMessageFormProps {
  disputeId: string;
  transactionId: string;
  clientId: string;
  vendorId: string | null;
  onSuccess: () => void;
}

export const AdminMessageForm = ({
  disputeId,
  transactionId,
  clientId,
  vendorId,
  onSuccess,
}: AdminMessageFormProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: "Empty message", description: "Please enter a message.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert dispute event
      const { error: eventError } = await supabase
        .from("dispute_events")
        .insert({
          dispute_id: disputeId,
          user_id: user.id,
          event_type: "admin_message",
          description: trimmed,
        });

      if (eventError) throw eventError;

      // Notify both parties
      const notifyUsers = [clientId, vendorId].filter(Boolean) as string[];
      if (notifyUsers.length > 0) {
        await supabase.from("notifications").insert(
          notifyUsers.map((uid) => ({
            user_id: uid,
            type: "dispute_message",
            title: "Admin Message on Dispute",
            message: trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed,
            dispute_id: disputeId,
            transaction_id: transactionId,
          }))
        );
      }

      setMessage("");
      toast({ title: "Message sent", description: "Both parties have been notified." });
      onSuccess();
    } catch (error: any) {
      console.error("Admin message error:", error);
      toast({ title: "Failed to send", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-card border-2 border-primary/20 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-display font-semibold">Admin Message</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Send a message to both the buyer and vendor. It will appear in the dispute timeline.
      </p>
      <Textarea
        placeholder="Type your message to both parties..."
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 500))}
        rows={3}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">{message.length}/500 characters</p>
        <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm">
          <Send className="w-4 h-4 mr-2" />
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </div>
  );
};
