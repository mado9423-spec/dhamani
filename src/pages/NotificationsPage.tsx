import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listMyNotifications,
  markNotificationRead,
  NotificationRecord,
} from "../services/notification.service";
import { formatArabicDate } from "../services/transaction.service";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMyNotifications().then((data) => {
      setNotifications(data);
      setIsLoading(false);
    });
  }, []);

  async function handleOpen(notification: NotificationRecord) {
    if (notification.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    await markNotificationRead(notification.id);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F8FA] font-cairo">
      <header className="flex items-center gap-3 border-b border-[#E2E7EB] px-6 py-4">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="text-[#17212B]">
          ←
        </button>
        <h1 className="text-base font-bold text-[#17212B]">الإشعارات</h1>
      </header>

      <main className="px-6 py-4">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-shimmer rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex animate-fade-in-up flex-col items-center gap-2 pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EEF4] text-2xl">
              🔔
            </div>
            <p className="text-sm font-bold text-[#17212B]">لا توجد إشعارات حتى الآن</p>
            <p className="max-w-xs text-[13px] font-medium text-[#687581]">
              ستظهر هنا أي تحديثات على معاملاتك أو حسابك.
            </p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="flex flex-col gap-3">
            {notifications.map((notification, index) => (
              <button
                key={notification.id}
                onClick={() => handleOpen(notification)}
                className="flex animate-fade-in-up items-start gap-3 rounded-2xl border border-[#E2E7EB] bg-white p-4 text-right shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:bg-[#F5F6F7]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {!notification.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#123F63]" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      notification.isRead ? "font-semibold" : "font-extrabold"
                    } text-[#17212B]`}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-1 text-[13px] font-medium text-[#687581]">
                    {notification.body}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-[#9CA3AF]">
                    {formatArabicDate(notification.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
