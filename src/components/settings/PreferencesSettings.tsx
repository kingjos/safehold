import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Globe, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreferencesSettingsProps {
  userType: "client" | "vendor" | "admin";
}

export const PreferencesSettings = ({ userType }: PreferencesSettingsProps) => {
  const { toast } = useToast();
  const [theme, setTheme] = useState("system");
  const [language, setLanguage] = useState("en");

  const [notifications, setNotifications] = useState({
    email: {
      escrowCreated: true,
      escrowFunded: true,
      taskCompleted: true,
      fundsReleased: true,
      disputes: true,
      marketing: false,
    },
    push: {
      escrowCreated: true,
      escrowFunded: true,
      taskCompleted: true,
      fundsReleased: true,
      disputes: true,
    },
    sms: {
      fundsReleased: true,
      disputes: true,
    },
  });

  const handleSave = () => {
    toast({
      title: "Preferences saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const notificationTypes = [
    { key: "escrowCreated", label: "Escrow Created", description: "When a new escrow is created" },
    { key: "escrowFunded", label: "Escrow Funded", description: "When funds are deposited" },
    { key: "taskCompleted", label: "Task Completed", description: "When a task is marked complete" },
    { key: "fundsReleased", label: "Funds Released", description: "When funds are released" },
    { key: "disputes", label: "Disputes", description: "Updates on dispute resolutions" },
  ];

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sun className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Appearance</h3>
            <p className="text-sm text-muted-foreground">Customize how the app looks</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    English
                  </div>
                </SelectItem>
                <SelectItem value="yo">Yoruba</SelectItem>
                <SelectItem value="ig">Igbo</SelectItem>
                <SelectItem value="ha">Hausa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h3 className="font-medium">Email Notifications</h3>
            <p className="text-sm text-muted-foreground">Manage what emails you receive</p>
          </div>
        </div>

        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
              <Switch
                checked={notifications.email[type.key as keyof typeof notifications.email]}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    email: { ...notifications.email, [type.key]: checked },
                  })
                }
              />
            </div>
          ))}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="font-medium text-sm">Marketing & Updates</p>
              <p className="text-xs text-muted-foreground">News, tips, and special offers</p>
            </div>
            <Switch
              checked={notifications.email.marketing}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, marketing: checked },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">Manage in-app and browser notifications</p>
          </div>
        </div>

        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
              <Switch
                checked={notifications.push[type.key as keyof typeof notifications.push]}
                onCheckedChange={(checked) =>
                  setNotifications({
                    ...notifications,
                    push: { ...notifications.push, [type.key]: checked },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* SMS Notifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-medium">SMS Notifications</h3>
            <p className="text-sm text-muted-foreground">Important alerts via SMS (charges may apply)</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="font-medium text-sm">Funds Released</p>
              <p className="text-xs text-muted-foreground">SMS when funds are released</p>
            </div>
            <Switch
              checked={notifications.sms.fundsReleased}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, fundsReleased: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <p className="font-medium text-sm">Dispute Alerts</p>
              <p className="text-xs text-muted-foreground">SMS for urgent dispute updates</p>
            </div>
            <Switch
              checked={notifications.sms.disputes}
              onCheckedChange={(checked) =>
                setNotifications({
                  ...notifications,
                  sms: { ...notifications.sms, disputes: checked },
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Preferences</Button>
      </div>
    </div>
  );
};
