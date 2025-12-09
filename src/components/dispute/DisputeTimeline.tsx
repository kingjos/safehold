import { DisputeEvent } from "@/types/dispute";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  MessageSquare, 
  FileText, 
  Shield, 
  ArrowUp, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

interface DisputeTimelineProps {
  events: DisputeEvent[];
}

const getEventIcon = (type: DisputeEvent["type"]) => {
  switch (type) {
    case "opened":
      return <AlertTriangle className="w-4 h-4" />;
    case "response":
      return <MessageSquare className="w-4 h-4" />;
    case "evidence":
      return <FileText className="w-4 h-4" />;
    case "admin_message":
      return <Shield className="w-4 h-4" />;
    case "escalated":
      return <ArrowUp className="w-4 h-4" />;
    case "resolved":
      return <CheckCircle2 className="w-4 h-4" />;
    case "closed":
      return <XCircle className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
};

const getEventStyles = (type: DisputeEvent["type"]) => {
  switch (type) {
    case "opened":
      return "bg-destructive text-destructive-foreground";
    case "response":
    case "evidence":
      return "bg-secondary text-secondary-foreground";
    case "admin_message":
      return "bg-primary text-primary-foreground";
    case "escalated":
      return "bg-warning text-warning-foreground";
    case "resolved":
      return "bg-success text-success-foreground";
    case "closed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getRoleBadge = (role: DisputeEvent["actorRole"]) => {
  switch (role) {
    case "client":
      return "bg-primary/10 text-primary";
    case "vendor":
      return "bg-secondary/10 text-secondary";
    case "admin":
      return "bg-destructive/10 text-destructive";
    case "system":
      return "bg-muted text-muted-foreground";
  }
};

export const DisputeTimeline = ({ events }: DisputeTimelineProps) => {
  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventStyles(event.type)}`}>
              {getEventIcon(event.type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>

          {/* Event content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-medium">{event.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getRoleBadge(event.actorRole)}`}>
                {event.actorRole}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{event.actor}</span>
              <span>•</span>
              <span>{format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
