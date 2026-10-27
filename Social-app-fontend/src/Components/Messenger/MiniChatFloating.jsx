import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Maximize2, MessageSquare, SquarePen, Users, X } from "lucide-react";
import Route from "../../Components/Routes/index";
import {
  getConversations,
  setActiveConversation,
} from "../../Redux/Reducer/chatSlice";
import { RowListSkeleton } from "../Common/FlatSkeleton";

const formatShortRelativeTime = (timestamp, isEn = false) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return isEn ? "Just now" : "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w`;
};

const MiniChatFloating = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const currentUser = useSelector((state) => state.login?.userInfo) || {};
  const { conversations = [], loading } = useSelector((state) => state.chat);

  const currentUserId = currentUser.id;
  const currentUserAvatar =
    currentUser.userImage || currentUser.avatar || "/default-avatar.png";

  useEffect(() => {
    if (currentUserId && conversations.length === 0) {
      dispatch(getConversations(currentUserId));
    }
  }, [currentUserId, conversations.length, dispatch]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );
  }, [conversations]);

  const getConversationDisplay = (conversation) => {
    if (conversation.isGroupChat) {
      return {
        name: conversation.name || t("messenger.groupChat"),
        image: "/group-avatar.png",
        isGroup: true,
      };
    }

    if (conversation.participants && conversation.participants.length > 0) {
      const otherUser = conversation.participants.find(
        (p) => (p.userId || p.id) !== currentUserId
      );
      if (otherUser) {
        return {
          name: otherUser.userFullname || otherUser.userNickname,
          image: otherUser.userImage || "/default-avatar.png",
          isGroup: false,
        };
      }
    }

    if (conversation.name && conversation.name.includes("between")) {
      const nameParts = conversation.name
        .replace("Chat between ", "")
        .split(" and ");
      const otherUserName = nameParts.find(
        (name) =>
          !name
            .toLowerCase()
            .includes((currentUser?.userNickname || "").toLowerCase())
      );
      return {
        name: otherUserName || t("messenger.untitled"),
        image: "/default-avatar.png",
        isGroup: false,
      };
    }

    return {
      name: t("messenger.untitled"),
      image: "/default-avatar.png",
      isGroup: false,
    };
  };

  const getLastMessageSnippet = (lastMessage) => {
    if (!lastMessage) return "";
    const isMine = lastMessage.senderId === currentUserId;
    const content =
      typeof lastMessage.content === "string" ? lastMessage.content : "";
    const isAttachment =
      lastMessage.messageType === "IMAGE" ||
      content.startsWith("image:") ||
      content.startsWith("file:") ||
      content.includes("[Attachment]") ||
      content.includes("[Hình ảnh]");

    if (isAttachment) {
      return isMine
        ? t("messenger.youSentAttachment")
        : `${lastMessage.senderNickname || "User"} ${t("messenger.attachment")}`;
    }

    if (isMine) {
      return `${isEn ? "You" : "Bạn"}: ${content}`;
    }
    return content;
  };

  const handleExpand = () => {
    setIsOpen(false);
    navigate(Route.chat);
  };

  const handleSelectConversation = (conversation) => {
    dispatch(setActiveConversation(conversation.id));
    setIsOpen(false);
    navigate(Route.chat);
  };

  if (!currentUserId) return null;

  return (
    <>
      {/* Nút bấm nổi "Tin nhắn" (Hình 2) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={t("messenger.title")}
          className="fixed bottom-5 right-6 z-40 hidden md:flex items-center gap-2.5 rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-white shadow-xl transition-all duration-120 hover:bg-[#262626] active:scale-[0.97]"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare size={20} strokeWidth={1.75} aria-hidden="true" />
            {totalUnreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ig-like px-1 text-[10px] font-bold text-white tabular-nums">
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </span>
            )}
          </div>
          <span className="text-[14px] font-semibold text-white tracking-tight">
            {t("messenger.title")}
          </span>
          <img
            src={currentUserAvatar}
            alt=""
            className="h-6 w-6 rounded-full object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.png";
            }}
          />
        </button>
      )}

      {/* Cửa sổ Mini Chat (Hình 3) */}
      {isOpen && (
        <section
          aria-label={t("messenger.title")}
          className="fixed bottom-4 right-6 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-[#2e2e2e] bg-[#121212] shadow-2xl transition-all duration-200"
        >
          {/* Topbar mini chat */}
          <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#262626] px-4 bg-[#121212]">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-white">
                {t("messenger.title")}
              </h2>
              {totalUnreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ig-like px-1.5 text-[11px] font-bold text-white tabular-nums">
                  {totalUnreadCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Nút expand nhảy sang mục tin nhắn */}
              <button
                type="button"
                onClick={handleExpand}
                aria-label={t("messenger.expand")}
                title={t("messenger.expand")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted transition-colors hover:bg-ig-surface hover:text-white"
              >
                <Maximize2 size={17} strokeWidth={1.75} />
              </button>

              {/* Nút tắt cửa sổ */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("messenger.close")}
                title={t("messenger.close")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted transition-colors hover:bg-ig-surface hover:text-white"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          {/* Danh sách cuộc trò chuyện */}
          <div className="relative flex-1 overflow-y-auto px-2 py-2">
            {loading && conversations.length === 0 ? (
              <RowListSkeleton count={5} rowHeight="h-16" />
            ) : conversations.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-[14px] font-medium text-ig-muted">
                  {t("messenger.noConversations")}
                </p>
                <button
                  type="button"
                  onClick={handleExpand}
                  className="mt-3 text-[13px] font-semibold text-ig-accent hover:underline"
                >
                  {t("messenger.startChat")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1 pb-12">
                {conversations.map((conversation) => {
                  const displayInfo = getConversationDisplay(conversation);
                  const hasUnread = conversation.unreadCount > 0;
                  const lastMessageSnippet = getLastMessageSnippet(
                    conversation.lastMessage
                  );
                  const timeFormatted = formatShortRelativeTime(
                    conversation.lastMessage?.createdAt,
                    isEn
                  );

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => handleSelectConversation(conversation)}
                      className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[#1a1a1a]"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {displayInfo.isGroup ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
                            <Users size={20} strokeWidth={1.5} aria-hidden="true" />
                          </div>
                        ) : (
                          <img
                            src={displayInfo.image}
                            alt=""
                            className="h-12 w-12 rounded-full bg-ig-surface object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/default-avatar.png";
                            }}
                          />
                        )}
                      </div>

                      {/* Thông tin tin nhắn */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[14px] ${
                            hasUnread
                              ? "font-semibold text-white"
                              : "font-medium text-white"
                          }`}
                        >
                          {displayInfo.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <p
                            className={`truncate text-[12px] ${
                              hasUnread
                                ? "font-semibold text-white"
                                : "text-ig-muted"
                            }`}
                          >
                            {lastMessageSnippet || t("messenger.startChat")}
                          </p>
                          {timeFormatted && (
                            <span className="shrink-0 text-[12px] text-ig-faint tabular-nums">
                              · {timeFormatted}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chấm xanh khi có tin nhắn chưa đọc (Hình 3) */}
                      {hasUnread && (
                        <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-ig-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Nút soạn tin nhắn ở góc dưới bên phải */}
            <div className="pointer-events-none absolute bottom-3 right-3">
              <button
                type="button"
                onClick={handleExpand}
                aria-label={t("messenger.newMessage")}
                title={t("messenger.newMessage")}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] text-white shadow-lg transition-transform duration-120 hover:bg-[#262626] active:scale-[0.97]"
              >
                <SquarePen size={18} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default MiniChatFloating;
