import { Check, Clock, AlertCircle, DollarSign, FileText, User, Shield } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "created" | "funded" | "in_progress" | "completed" | "released" | "disputed" | "cancelled";
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
}

interface EscrowTimelineProps {
  events: TimelineEvent[];
}

const getEventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "created":
      return <FileText className="h-4 w-4" />;
    case "funded":
      return <DollarSign className="h-4 w-4" />;
    case "in_progress":
      return <Clock className="h-4 w-4" />;
    case "completed":
      return <Check className="h-4 w-4" />;
    case "released":
      return <Shield className="h-4 w-4" />;
    case "disputed":
      return <AlertCircle className="h-4 w-4" />;
    case "cancelled":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getEventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "created":
      return "bg-muted text-muted-foreground";
    case "funded":
      return "bg-primary text-primary-foreground";
    case "in_progress":
      return "bg-secondary text-secondary-foreground";
    case "completed":
      return "bg-success text-success-foreground";
    case "released":
      return "bg-success text-success-foreground";
    case "disputed":
      return "bg-destructive text-destructive-foreground";
    case "cancelled":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export function EscrowTimeline({ events }: EscrowTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2 min-h-[40px]" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground">{event.title}</h4>
              <span className="text-xs text-muted-foreground">{event.timestamp}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
            {event.actor && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{event.actor}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
