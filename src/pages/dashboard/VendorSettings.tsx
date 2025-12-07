import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { BankAccountSettings } from "@/components/settings/BankAccountSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, Shield, Settings } from "lucide-react";

const VendorSettings = () => {
  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your business profile and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4 hidden sm:block" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <Building2 className="w-4 h-4 hidden sm:block" />
              Bank
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4 hidden sm:block" />
              Security
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="w-4 h-4 hidden sm:block" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <div className="rounded-2xl bg-card border border-border shadow-soft p-6">
            <TabsContent value="profile" className="mt-0">
              <ProfileSettings userType="vendor" />
            </TabsContent>
            <TabsContent value="bank" className="mt-0">
              <BankAccountSettings />
            </TabsContent>
            <TabsContent value="security" className="mt-0">
              <SecuritySettings />
            </TabsContent>
            <TabsContent value="preferences" className="mt-0">
              <PreferencesSettings userType="vendor" />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default VendorSettings;
