import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Legend,
} from "recharts";

const reasonLabels: Record<string, string> = {
  service_not_delivered: "Not Delivered",
  quality_issues: "Quality Issues",
  late_delivery: "Late Delivery",
  payment_dispute: "Payment Issue",
  communication_issues: "Communication",
  scope_disagreement: "Scope",
  other: "Other",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--secondary))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

interface DisputeRow {
  id: string;
  status: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("disputes")
        .select("id, status, reason, created_at, resolved_at, resolution")
        .order("created_at", { ascending: false });
      if (!error && data) setDisputes(data as DisputeRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const total = disputes.length;
  const resolved = disputes.filter((d) =>
    ["resolved", "closed"].includes(d.status)
  ).length;
  const open = disputes.filter((d) =>
    ["open", "under_review", "awaiting_response", "escalated"].includes(d.status)
  ).length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Avg resolution time (hours)
  const resolvedWithTime = disputes.filter((d) => d.resolved_at);
  const avgHours =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, d) => {
          const ms =
            new Date(d.resolved_at!).getTime() -
            new Date(d.created_at).getTime();
          return sum + ms / (1000 * 60 * 60);
        }, 0) / resolvedWithTime.length
      : 0;
  const avgDays = avgHours / 24;

  // Reasons breakdown
  const reasonCounts = disputes.reduce<Record<string, number>>((acc, d) => {
    acc[d.reason] = (acc[d.reason] || 0) + 1;
    return acc;
  }, {});
  const reasonData = Object.entries(reasonCounts).map(([key, value]) => ({
    name: reasonLabels[key] || key,
    value,
  }));

  // Resolution outcomes from resolution JSON
  const outcomeCounts = disputes.reduce<Record<string, number>>((acc, d) => {
    if (!d.resolution) return acc;
    try {
      const r = JSON.parse(d.resolution);
      const t = r.type || "other";
      acc[t] = (acc[t] || 0) + 1;
    } catch {
      /* ignore */
    }
    return acc;
  }, {});
  const outcomeData = [
    { name: "Refund Client", value: outcomeCounts.refund_client || 0 },
    { name: "Pay Vendor", value: outcomeCounts.pay_vendor || 0 },
    { name: "Partial Refund", value: outcomeCounts.partial_refund || 0 },
  ];

  // Disputes per month (last 6 months)
  const months: { name: string; opened: number; resolved: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const opened = disputes.filter((x) => {
      const c = new Date(x.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    const resolvedM = disputes.filter((x) => {
      if (!x.resolved_at) return false;
      const c = new Date(x.resolved_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    months.push({ name: label, opened, resolved: resolvedM });
  }

  const trendConfig: ChartConfig = {
    opened: { label: "Opened", color: "hsl(var(--destructive))" },
    resolved: { label: "Resolved", color: "hsl(var(--success))" },
  };
  const outcomeConfig: ChartConfig = {
    value: { label: "Disputes", color: "hsl(var(--primary))" },
  };

  return (
    <DashboardLayout userType="admin">
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              Dispute Analytics
            </h1>
            <p className="text-muted-foreground">
              Insights into platform dispute performance.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Disputes"
                value={total.toString()}
                icon={<AlertTriangle className="w-6 h-6 text-primary" />}
                tone="primary"
              />
              <KpiCard
                label="Resolution Rate"
                value={`${resolutionRate}%`}
                icon={<TrendingUp className="w-6 h-6 text-success" />}
                tone="success"
                sub={`${resolved} of ${total} resolved`}
              />
              <KpiCard
                label="Avg Resolution Time"
                value={
                  avgDays >= 1
                    ? `${avgDays.toFixed(1)}d`
                    : `${avgHours.toFixed(1)}h`
                }
                icon={<Clock className="w-6 h-6 text-warning" />}
                tone="warning"
                sub={`Across ${resolvedWithTime.length} resolved`}
              />
              <KpiCard
                label="Open Disputes"
                value={open.toString()}
                icon={<CheckCircle2 className="w-6 h-6 text-destructive" />}
                tone="destructive"
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Trend */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
                <h2 className="text-lg font-display font-semibold mb-4">
                  Disputes Trend (6 months)
                </h2>
                <ChartContainer config={trendConfig} className="h-72 w-full">
                  <BarChart data={months}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="opened" fill="var(--color-opened)" radius={4} />
                    <Bar dataKey="resolved" fill="var(--color-resolved)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>

              {/* Reasons pie */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
                <h2 className="text-lg font-display font-semibold mb-4">
                  Dispute Reasons
                </h2>
                {reasonData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    No dispute data yet.
                  </p>
                ) : (
                  <ChartContainer config={outcomeConfig} className="h-72 w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={reasonData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {reasonData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                )}
              </div>

              {/* Resolution outcomes */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-soft lg:col-span-2">
                <h2 className="text-lg font-display font-semibold mb-4">
                  Resolution Outcomes
                </h2>
                <ChartContainer config={outcomeConfig} className="h-64 w-full">
                  <BarChart data={outcomeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

const toneClass: Record<string, string> = {
  primary: "bg-primary/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
};

const KpiCard = ({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: keyof typeof toneClass;
  sub?: string;
}) => (
  <div className="p-6 rounded-2xl bg-card border border-border shadow-soft">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${toneClass[tone]}`}>
      {icon}
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-display font-bold">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default AdminAnalytics;
