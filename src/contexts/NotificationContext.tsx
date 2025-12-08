import { createContext, useContext, useState, ReactNode } from "react";

export type NotificationType = 
  | "escrow_created" 
  | "payment_secured" 
  | "work_started" 
  | "work_completed" 
  | "funds_released" 
  | "dispute_opened" 
  | "dispute_resolved"
  | "escrow_cancelled";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  escrowId?: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Mock initial notifications
const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "payment_secured",
    title: "Payment Secured",
    message: "₦150,000 has been secured in escrow for Website Development project",
    escrowId: "ESC-2024-001",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
  },
  {
    id: "2",
    type: "work_started",
    title: "Work Started",
    message: "TechVendor Ltd has started work on your Mobile App Design project",
    escrowId: "ESC-2024-002",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: "3",
    type: "work_completed",
    title: "Work Completed",
    message: "Logo Design project has been marked as complete. Please review and release funds.",
    escrowId: "ESC-2024-003",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "4",
    type: "funds_released",
    title: "Funds Released",
    message: "₦75,000 has been released for Brand Identity project",
    escrowId: "ESC-2024-004",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
  {
    id: "5",
    type: "escrow_created",
    title: "New Escrow Created",
    message: "You've been added to a new escrow for Content Writing project worth ₦50,000",
    escrowId: "ESC-2024-005",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
  },
];

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
