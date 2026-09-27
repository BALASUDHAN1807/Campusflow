import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useAuthStore } from "@/store/authStore";

interface NotificationBadgeProps {
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className = "" }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchCount = async () => {
      try {
        const res = await notificationService.getUnreadCount();
        if (isMounted && res.success && res.data) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch (err) {
        // Silently handle transient polling error
      }
    };

    fetchCount();
    const timerId = setInterval(fetchCount, 5000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [isAuthenticated]);

  return (
    <Link
      to="/student/notifications"
      className={`relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ${className}`}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
};
