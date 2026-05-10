import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EvidenceUploaderProps {
  disputeId: string;
  onUploaded?: () => void;
  /** Used to label uploads (e.g. "Buyer evidence" / "Vendor proof") */
  title?: string;
  className?: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "text/plain",
];

export const EvidenceUploader = ({
  disputeId, onUploaded, title = "Upload evidence", className = "",
}: EvidenceUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      for (const file of list) {
        if (!ALLOWED.includes(file.type)) {
          toast({ title: `Unsupported file: ${file.name}`, variant: "destructive" });
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast({ title: `${file.name} exceeds 10 MB`, variant: "destructive" });
          continue;
        }

        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${disputeId}/${user.id}-${Date.now()}-${safeName}`;

        // RLS: bucket policy allows insert only when (foldername(name))[1] == disputeId
        // AND is_dispute_party(auth.uid(), disputeId) is true.
        const { error: upErr } = await supabase.storage
          .from("dispute-evidence")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          toast({ title: `Upload failed: ${file.name}`, description: upErr.message, variant: "destructive" });
          continue;
        }

        const { error: rowErr } = await supabase.from("dispute_evidence").insert({
          dispute_id: disputeId,
          uploaded_by: user.id,
          file_url: path,
          file_name: file.name,
          file_type: file.type.startsWith("image/") ? "image" : "document",
        });
        if (rowErr) {
          // best-effort cleanup if metadata insert failed
          await supabase.storage.from("dispute-evidence").remove([path]);
          toast({ title: `Could not record: ${file.name}`, description: rowErr.message, variant: "destructive" });
          continue;
        }

        // Audit event
        await supabase.from("dispute_events").insert({
          dispute_id: disputeId,
          user_id: user.id,
          event_type: "evidence",
          description: `Uploaded evidence: ${file.name}`,
        });
      }
      toast({ title: "Evidence uploaded", description: "Authorized parties and admins can now view it." });
      onUploaded?.();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border bg-muted/30"
        }`}
      >
        <FileUp className="w-6 h-6 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground text-center">
          Drag & drop, or click to browse. PNG, JPG, WEBP, PDF, TXT — max 10 MB each.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {busy ? "Uploading…" : "Choose files"}
        </Button>
      </div>
    </div>
  );
};
