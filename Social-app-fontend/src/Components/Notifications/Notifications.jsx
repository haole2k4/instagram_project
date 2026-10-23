import React, { useState, useEffect, useRef } from "react";
import notificationSocket from "../../Service/NotificationSocket";
import { fetchAllNotificationsbyUser } from "../../Service/notificationApi";
import { useDispatch, useSelector } from "react-redux";
import { formatTime } from "../../Utils";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import { RowListSkeleton } from "../Common/FlatSkeleton";
import EmptyState from "../Common/EmptyState";

const Notification = ({ isOpen = true, onClose, standalone = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userInfo } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [userInfo?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || standalone || !onClose) return;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, standalone]);

  useEffect(() => {
    if (!userInfo?.id || !isOpen) return;

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
  }, [userInfo?.id, isOpen, dispatch]);

  if (!isOpen) return null;

  const containerClass = standalone
    ? "mx-auto min-h-screen w-full max-w-[600px] bg-ig-ground px-4 py-6 text-ig-text"
    : "fixed bottom-14 left-0 top-0 z-[100] flex w-full flex-col border-r border-ig-border bg-ig-ground md:bottom-0 md:left-rail md:w-[397px] animate-in shadow-2xl";

  const HeadingTag = standalone ? "h1" : "h2";

  return (
    <div ref={panelRef} className={containerClass}>
      <div className="sticky top-0 z-10 border-b border-ig-border bg-ig-ground px-4 py-3.5">
        <div className="flex items-center justify-between">
          <HeadingTag className="text-[24px] font-semibold tracking-[-0.02em] text-ig-text">
            {t("notifications.title")}
          </HeadingTag>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close") || "Close"}
              className="rounded-lg p-2 text-ig-muted transition-colors hover:text-ig-text"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-ig-rule">
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
              className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-ig-surface"
            >
              <img
                src={
                  notification.senderAvatar ||
                  "/default-avatar.png"
                }
                alt=""
                className="h-11 w-11 shrink-0 rounded-full border border-ig-border object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
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
