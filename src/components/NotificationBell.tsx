import { Bell, Check, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: (typeof notifications)[0]) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.reference_id) {
      navigate("/announcements");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            background: "transparent",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <Bell style={{ width: 17, height: 17 }} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              height: 16, minWidth: 16, borderRadius: 8,
              background: "#c44", color: "#fff",
              fontSize: 10, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors",
                  !n.is_read && "bg-muted/30"
                )}
                style={{
                  borderLeft: n.is_action_required && !n.is_read ? "3px solid #A04040" : "3px solid transparent",
                }}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className="shrink-0 mt-0.5">
                    {n.type === "reply" ? (
                      <MessageSquare style={{ width: 14, height: 14, color: "#52657A" }} />
                    ) : (
                      <Mail style={{ width: 14, height: 14, color: "#52657A" }} />
                    )}
                  </div>
                  <div className={cn("flex-1 min-w-0")}>
                    <p className="text-sm font-medium leading-tight">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                      {n.is_action_required && !n.is_read && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#A04040",
                          backgroundColor: "#F5D6D6",
                          padding: "1px 5px",
                          borderRadius: 6,
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                        }}>
                          Action Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
