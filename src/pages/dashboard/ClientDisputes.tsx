import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DisputeList } from "@/components/dispute/DisputeList";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";

const ClientDisputes = () => {
  const { disputes, loading } = useDisputes("client");

  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Disputes</h1>
            <p className="text-muted-foreground">Track and manage your escrow disputes.</p>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DisputeList disputes={disputes} userType="client" />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDisputes;
