import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Key, Smartphone, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const SecuritySettings = () => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [transactionPin, setTransactionPin] = useState(true);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Password changed",
      description: "Your password has been updated successfully.",
    });
    setIsChangingPassword(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handle2FAToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast({
      title: enabled ? "2FA Enabled" : "2FA Disabled",
      description: enabled 
        ? "Two-factor authentication is now active on your account."
        : "Two-factor authentication has been disabled.",
    });
  };

  const recentSessions = [
    { device: "Chrome on Windows", location: "Lagos, Nigeria", time: "Active now", current: true },
    { device: "Safari on iPhone", location: "Lagos, Nigeria", time: "2 hours ago", current: false },
    { device: "Chrome on MacOS", location: "Abuja, Nigeria", time: "Yesterday", current: false },
  ];

  return (
    <div className="space-y-8">
      {/* Password Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Password</h3>
            <p className="text-sm text-muted-foreground">Manage your account password</p>
          </div>
        </div>
        
        <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
          <DialogTrigger asChild>
            <Button variant="outline">Change Password</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleChangePassword}>
                  Update Password
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Two-Factor Authentication */}
      <div className="p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
          </div>
          <Switch checked={twoFactorEnabled} onCheckedChange={handle2FAToggle} />
        </div>
        {twoFactorEnabled && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 flex items-center gap-2 text-sm text-success">
            <CheckCircle className="w-4 h-4" />
            <span>2FA is enabled using authenticator app</span>
          </div>
        )}
      </div>

      {/* Security Options */}
      <div className="space-y-4">
        <h3 className="font-medium">Security Options</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-medium">Login Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified when someone logs into your account</p>
            </div>
            <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-medium">Transaction PIN</p>
              <p className="text-sm text-muted-foreground">Require PIN for all transactions</p>
            </div>
            <Switch checked={transactionPin} onCheckedChange={setTransactionPin} />
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium">Active Sessions</h3>
              <p className="text-sm text-muted-foreground">Manage devices logged into your account</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            Logout All
          </Button>
        </div>
        <div className="space-y-2">
          {recentSessions.map((session, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
              <div>
                <p className="font-medium text-sm">{session.device}</p>
                <p className="text-xs text-muted-foreground">{session.location} • {session.time}</p>
              </div>
              {session.current ? (
                <span className="text-xs font-medium text-success">Current</span>
              ) : (
                <Button variant="ghost" size="sm" className="text-xs">Logout</Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="font-medium text-destructive">Danger Zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
          Delete Account
        </Button>
      </div>
    </div>
  );
};
