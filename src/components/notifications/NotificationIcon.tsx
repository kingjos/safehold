import { 
  Shield, 
  CreditCard, 
  PlayCircle, 
  CheckCircle2, 
  Banknote, 
  AlertTriangle, 
  CheckCheck,
  XCircle
} from "lucide-react";
import { NotificationType } from "@/contexts/NotificationContext";

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

const iconConfig: Record<NotificationType, { icon: typeof Shield; color: string; bg: string }> = {
  escrow_created: { icon: Shield, color: "text-primary", bg: "bg-primary/10" },
  payment_secured: { icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  work_started: { icon: PlayCircle, color: "text-blue-600", bg: "bg-blue-500/10" },
  work_completed: { icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
  funds_released: { icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  dispute_opened: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-500/10" },
  dispute_resolved: { icon: CheckCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  escrow_cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

export const NotificationIcon = ({ type, className = "" }: NotificationIconProps) => {
  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center ${className}`}>
      <Icon className={`w-5 h-5 ${config.color}`} />
    </div>
  );
};
