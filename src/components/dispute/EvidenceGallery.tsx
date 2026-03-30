import { DisputeEvidence } from "@/types/dispute";
import { Image, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface EvidenceGalleryProps {
  evidence: DisputeEvidence[];
  title: string;
  emptyText?: string;
}

export const EvidenceGallery = ({ evidence, title, emptyText = "No evidence submitted" }: EvidenceGalleryProps) => {
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
            {item.type === "image" ? (
              <img src={item.url} alt={item.name} className="w-full h-28 object-cover" />
            ) : (
              <div className="w-full h-28 flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-2">
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(item.uploadedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
