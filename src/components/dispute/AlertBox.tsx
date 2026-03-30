import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface AlertBoxProps {
  variant?: "warning" | "info" | "success";
  children: React.ReactNode;
}

const variantStyles = {
  warning: {
    container: "bg-warning/10 border-warning/20",
    icon: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />,
  },
  info: {
    container: "bg-primary/5 border-primary/20",
    icon: <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />,
  },
  success: {
    container: "bg-success/10 border-success/20",
    icon: <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />,
  },
};

export const AlertBox = ({ variant = "warning", children }: AlertBoxProps) => {
  const styles = variantStyles[variant];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles.container}`}>
      {styles.icon}
      <div className="text-sm">{children}</div>
    </div>
  );
};
