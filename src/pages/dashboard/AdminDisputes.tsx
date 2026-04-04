import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeList } from "@/components/dispute/DisputeList";
import { AlertTriangle, TrendingDown, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";

const AdminDisputes = () => {
  const { disputes, loading } = useDisputes("client"); // Admin sees all via RLS

  const openCount = disputes.filter(d => d.status === "open").length;
  const activeCount = disputes.filter(d => 
    ["under_review", "awaiting_response", "escalated"].includes(d.status)
  ).length;
  const resolvedCount = disputes.filter(d => 
    ["resolved", "closed"].includes(d.status)
  ).length;

  return (
    <DashboardLayout userType="admin">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Dispute Management</h1>
              <p className="text-muted-foreground">Review and resolve platform disputes.</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-display font-bold">{openCount}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-display font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Disputes</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-display font-bold">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DisputeList disputes={disputes} userType="admin" />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDisputes;
