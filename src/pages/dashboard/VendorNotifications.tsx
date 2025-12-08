import { Bell, Check, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useNotifications } from "@/contexts/NotificationContext";

const VendorNotifications = () => {
  const { unreadCount, markAllAsRead, clearAll } = useNotifications();

  return (
    <DashboardLayout userType="vendor">
      <div className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on your jobs and payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear all
            </Button>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</p>
              <p className="text-sm text-muted-foreground">Click on a notification to mark it as read</p>
            </div>
          </div>
        )}

        <NotificationList transactionBasePath="/vendor/transactions" />
      </div>
    </DashboardLayout>
  );
};

export default VendorNotifications;
