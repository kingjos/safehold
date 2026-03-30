import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  deadline: string;
  label?: string;
}

export const CountdownTimer = ({ deadline, label = "Respond within" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setIsUrgent(hours < 12);
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${isExpired 
        ? "bg-destructive/10 text-destructive" 
        : isUrgent 
          ? "bg-warning/10 text-warning" 
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Clock className="w-3 h-3" />
      <span>{label} {timeLeft}</span>
    </div>
  );
};
