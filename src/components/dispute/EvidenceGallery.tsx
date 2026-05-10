import { useEffect, useState } from "react";
import { DisputeEvidence } from "@/types/dispute";
import { FileText, ExternalLink, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface EvidenceGalleryProps {
  evidence: DisputeEvidence[];
  title: string;
  emptyText?: string;
}

export const EvidenceGallery = ({
  evidence, title, emptyText = "No evidence submitted",
}: EvidenceGalleryProps) => {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const images = evidence.filter((e) => e.type === "image");
      if (images.length === 0) return;
      const map: Record<string, string> = {};
      for (const item of images) {
        const { data } = await supabase.storage
          .from("dispute-evidence")
          .createSignedUrl(item.url, 60 * 10); // 10 min preview
        if (data?.signedUrl) map[item.id] = data.signedUrl;
      }
      if (!cancelled) setThumbs(map);
    })();
    return () => { cancelled = true; };
  }, [evidence]);

  const openSigned = async (item: DisputeEvidence) => {
    setOpening(item.id);
    try {
      const { data, error } = await supabase.storage
        .from("dispute-evidence")
        .createSignedUrl(item.url, 60 * 5);
      if (error || !data?.signedUrl) {
        toast({
          title: "Cannot open file",
          description: error?.message ?? "You may not have access to this evidence.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setOpening(null);
    }
  };

  const downloadSigned = async (item: DisputeEvidence) => {
    setDownloading(item.id);
    try {
      // Short-lived signed URL with forced download (60s)
      const { data, error } = await supabase.storage
        .from("dispute-evidence")
        .createSignedUrl(item.url, 60, { download: item.name });
      if (error || !data?.signedUrl) {
        toast({
          title: "Cannot download file",
          description: error?.message ?? "You may not have access to this evidence.",
          variant: "destructive",
        });
        return;
      }
      // Fetch and trigger a download via blob so the browser saves it directly
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  if (evidence.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
        <h3 className="font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {evidence.map((item) => (
          <div key={item.id} className="group relative rounded-lg border border-border overflow-hidden bg-muted">
            {item.type === "image" && thumbs[item.id] ? (
              <img src={thumbs[item.id]} alt={item.name} className="w-full h-28 object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-28 flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-2 space-y-2">
              <p className="text-xs font-medium truncate" title={item.name}>{item.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(item.uploadedAt), "MMM d, yyyy")}
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  size="sm" variant="outline" className="w-full gap-1 h-7 text-xs px-1"
                  onClick={() => openSigned(item)}
                  disabled={opening === item.id}
                >
                  {opening === item.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <ExternalLink className="w-3 h-3" />}
                  View
                </Button>
                <Button
                  size="sm" variant="outline" className="w-full gap-1 h-7 text-xs px-1"
                  onClick={() => downloadSigned(item)}
                  disabled={downloading === item.id}
                >
                  {downloading === item.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Download className="w-3 h-3" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
