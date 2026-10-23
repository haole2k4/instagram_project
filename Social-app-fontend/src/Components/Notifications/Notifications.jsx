import React, { useState, useEffect } from "react";
import notificationSocket from "../../Service/NotificationSocket";
import { fetchAllNotificationsbyUser } from "../../Service/notificationApi";
import { useDispatch, useSelector } from "react-redux";
import { formatTime } from "../../Utils";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { RowListSkeleton } from "../Common/FlatSkeleton";
import EmptyState from "../Common/EmptyState";

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      if (!userInfo?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetchAllNotificationsbyUser(userInfo.id);
        setNotifications(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error("Lỗi khi fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userInfo?.id]);

  useEffect(() => {
    if (!userInfo?.id) return;

    const unsubscribeComments = notificationSocket.subscribeToCommentUpdates(
      (data) => {
        const enriched = {
          ...data,
          sentAt: data.sentAt || new Date().toISOString(),
        };

        setNotifications((prev) => {
          if (
            (enriched.notificationId != null &&
              prev.some((n) => n.notificationId === enriched.notificationId)) ||
            (enriched.id != null && prev.some((n) => n.id === enriched.id))
          ) {
            return prev;
          }
          return [enriched, ...prev];
        });
      }
    );

    const unsubscribeLikes = notificationSocket.subscribeToLikeUpdates(
      (notification) => {
        const enrichedNotification = {
          ...notification,
          sentAt: notification.sentAt || new Date().toISOString(),
        };

        setNotifications((prev) => {
          if (
            (enrichedNotification.notificationId != null &&
              prev.some(
                (n) => n.notificationId === enrichedNotification.notificationId
              )) ||
            prev.some(
              (n) =>
                n.postId === enrichedNotification.postId &&
                n.userNickname === enrichedNotification.userNickname &&
                n.message === enrichedNotification.message
            )
          ) {
            return prev;
          }
          return [enrichedNotification, ...prev];
        });
      }
    );

    const unsubscribeFollow = notificationSocket.subscribeToFollow((data) => {
      const enriched = {
        ...data,
        sentAt: data.sentAt || new Date().toISOString(),
      };

      setNotifications((prev) => {
        if (
          prev.some(
            (n) =>
              n.fromUserId === enriched.fromUserId &&
              n.sentAt === enriched.sentAt
          )
        ) {
          return prev;
        }
        return [enriched, ...prev];
      });
    });

    return () => {
      unsubscribeComments();
      unsubscribeLikes();
      unsubscribeFollow();
    };
  }, [userInfo?.id, dispatch]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[600px] bg-ig-ground px-4 py-6 text-ig-text">
      <h1 className="mb-4 border-b border-ig-rule pb-3 text-[20px] font-semibold tracking-[-0.02em] text-ig-text">
        {t("notifications.title")}
      </h1>

      <div className="divide-y divide-ig-rule">
        {loading ? (
          <RowListSkeleton count={6} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t("notifications.empty")}
          />
        ) : (
          notifications.map((notification, index) => (
            <div
              key={notification.notificationId || notification.id || index}
              className="flex min-h-[60px] items-center gap-3 px-2 py-3 transition-colors duration-150 hover:bg-ig-surface"
            >
              <img
                src={
                  notification.senderAvatar ||
                  "https://cdn.kona-blue.com/upload/kona-blue_com/post/images/2024/09/18/457/avatar-mac-dinh-1.jpg"
                }
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-ig-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-[1.4] text-ig-text">
                  {notification.message}
                </p>
                <span className="mt-0.5 block text-[12px] text-ig-muted">
                  {formatTime(notification.sentAt, t)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notification;
