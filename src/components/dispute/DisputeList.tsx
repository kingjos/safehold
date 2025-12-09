import { Dispute, DisputeStatus } from "@/types/dispute";
import { DisputeCard } from "./DisputeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useState } from "react";

interface DisputeListProps {
  disputes: Dispute[];
  userType: "client" | "vendor" | "admin";
}

export const DisputeList = ({ disputes, userType }: DisputeListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "all">("all");

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.escrowTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeDisputes = filteredDisputes.filter(
    (d) => !["closed", "resolved_client", "resolved_vendor"].includes(d.status)
  );
  const resolvedDisputes = filteredDisputes.filter((d) =>
    ["closed", "resolved_client", "resolved_vendor"].includes(d.status)
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search disputes..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as DisputeStatus | "all")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disputes</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="under_investigation">Under Investigation</SelectItem>
            <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
            <SelectItem value="resolved_client">Resolved (Client)</SelectItem>
            <SelectItem value="resolved_vendor">Resolved (Vendor)</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Disputes */}
      {activeDisputes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold">Active Disputes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeDisputes.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} userType={userType} />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Disputes */}
      {resolvedDisputes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-muted-foreground">
            Resolved Disputes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {resolvedDisputes.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} userType={userType} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredDisputes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No disputes found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "You don't have any disputes yet"}
          </p>
        </div>
      )}
    </div>
  );
};
