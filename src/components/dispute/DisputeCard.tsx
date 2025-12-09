import { Dispute } from "@/types/dispute";
import { DisputeStatusBadge } from "./DisputeStatusBadge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowRight, User, Building } from "lucide-react";
import { Link } from "react-router-dom";

interface DisputeCardProps {
  dispute: Dispute;
  userType: "client" | "vendor" | "admin";
}

export const DisputeCard = ({ dispute, userType }: DisputeCardProps) => {
  const getDetailLink = () => {
    switch (userType) {
      case "client":
        return `/dashboard/disputes/${dispute.id}`;
      case "vendor":
        return `/vendor/disputes/${dispute.id}`;
      case "admin":
        return `/admin/disputes/${dispute.id}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-semibold">{dispute.id}</p>
            <p className="text-sm text-muted-foreground">Escrow: {dispute.escrowId}</p>
          </div>
        </div>
        <DisputeStatusBadge status={dispute.status} />
      </div>

      <h3 className="font-medium mb-2">{dispute.escrowTitle}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {dispute.description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground text-xs">Client</p>
            <p className="font-medium">{dispute.client.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-muted-foreground text-xs">Vendor</p>
            <p className="font-medium">{dispute.vendor.name}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <p className="text-lg font-display font-bold">{formatCurrency(dispute.amount)}</p>
          <p className="text-xs text-muted-foreground">
            Opened {formatDistanceToNow(new Date(dispute.openedAt), { addSuffix: true })}
          </p>
        </div>
        <Link to={getDetailLink()}>
          <Button variant="outline" size="sm">
            View Details
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
