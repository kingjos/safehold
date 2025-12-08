import { Link } from "react-router-dom";
import { Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/contexts/NotificationContext";
import { NotificationIcon } from "./NotificationIcon";
import { formatDistanceToNow, format } from "date-fns";

interface NotificationListProps {
  transactionBasePath: string;
}

export const NotificationList = ({ transactionBasePath }: NotificationListProps) => {
  const { notifications, markAsRead, clearNotification } = useNotifications();

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = format(notification.createdAt, "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Today";
    } else if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Yesterday";
    } else {
      return format(date, "MMMM d, yyyy");
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
          <Bell className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No notifications</h3>
        <p className="text-muted-foreground">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedNotifications).map(([date, items]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {getDateLabel(date)}
          </h3>
          <div className="space-y-2">
            {items.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-all ${
                  !notification.read
                    ? "bg-accent/30 border-primary/20"
                    : "bg-card border-border hover:bg-accent/50"
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </span>
                      <div className="flex items-center gap-2">
                        {notification.escrowId && (
                          <Link to={`${transactionBasePath}/${notification.escrowId}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              View Details
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notification.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Need to import Bell here
import { Bell } from "lucide-react";
