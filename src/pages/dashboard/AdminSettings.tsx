import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Shield, Settings, Percent, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { toast } = useToast();
  const [platformSettings, setPlatformSettings] = useState({
    escrowFeePercent: "2.5",
    withdrawalFee: "50",
    minEscrowAmount: "5000",
    maxEscrowAmount: "50000000",
    disputeResolutionDays: "7",
    autoReleaseEnabled: true,
    autoReleaseDays: "3",
    maintenanceMode: false,
  });

  const handleSavePlatformSettings = () => {
    toast({
      title: "Platform settings updated",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <DashboardLayout userType="admin">
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Configure platform settings and your admin profile</p>
        </div>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="platform" className="gap-2">
              <Settings className="w-4 h-4 hidden sm:block" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4 hidden sm:block" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4 hidden sm:block" />
              Security
            </TabsTrigger>
          </TabsList>

          <div className="rounded-2xl bg-card border border-border shadow-soft p-6">
            <TabsContent value="platform" className="mt-0 space-y-8">
              {/* Fee Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Percent className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Fee Settings</h3>
                    <p className="text-sm text-muted-foreground">Configure platform fees</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="escrowFee">Escrow Fee (%)</Label>
                    <Input
                      id="escrowFee"
                      type="number"
                      step="0.1"
                      value={platformSettings.escrowFeePercent}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, escrowFeePercent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdrawalFee">Withdrawal Fee (₦)</Label>
                    <Input
                      id="withdrawalFee"
                      type="number"
                      value={platformSettings.withdrawalFee}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, withdrawalFee: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Transaction Limits */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Transaction Limits</h3>
                    <p className="text-sm text-muted-foreground">Set min/max escrow amounts</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minEscrow">Minimum Escrow (₦)</Label>
                    <Input
                      id="minEscrow"
                      type="number"
                      value={platformSettings.minEscrowAmount}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, minEscrowAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxEscrow">Maximum Escrow (₦)</Label>
                    <Input
                      id="maxEscrow"
                      type="number"
                      value={platformSettings.maxEscrowAmount}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, maxEscrowAmount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Auto-Release Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-medium">Auto-Release</h3>
                    <p className="text-sm text-muted-foreground">Configure automatic fund release</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div>
                      <p className="font-medium">Enable Auto-Release</p>
                      <p className="text-sm text-muted-foreground">Automatically release funds after completion confirmation</p>
                    </div>
                    <Switch
                      checked={platformSettings.autoReleaseEnabled}
                      onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, autoReleaseEnabled: checked })}
                    />
                  </div>
                  {platformSettings.autoReleaseEnabled && (
                    <div className="space-y-2">
                      <Label>Auto-Release Delay (Days)</Label>
                      <Input
                        type="number"
                        value={platformSettings.autoReleaseDays}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, autoReleaseDays: e.target.value })}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">Days to wait after task completion before auto-release</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Dispute Resolution Period (Days)</Label>
                  <Input
                    type="number"
                    value={platformSettings.disputeResolutionDays}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, disputeResolutionDays: e.target.value })}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">Maximum days allowed to resolve a dispute</p>
                </div>
              </div>

              {/* Maintenance Mode */}
              <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div>
                      <h3 className="font-medium">Maintenance Mode</h3>
                      <p className="text-sm text-muted-foreground">Temporarily disable the platform</p>
                    </div>
                  </div>
                  <Switch
                    checked={platformSettings.maintenanceMode}
                    onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, maintenanceMode: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePlatformSettings}>Save Platform Settings</Button>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <ProfileSettings userType="admin" />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <SecuritySettings />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
