import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { useSelector } from "react-redux";
import { ChevronRight, Plus, Search, Sparkles, Users } from "lucide-react";
import { handleGetFollowingByUser } from "../../Service/UserAPI";
import Route from "../../Components/Routes/index";
import { RowListSkeleton } from "../Common/FlatSkeleton";
import EmptyState from "../Common/EmptyState";

const ConversationList = ({
  conversations = [],
  currentConversationId,
  isAIChatActive = false,
  onSelectConversation,
  loading,
  setShowNewConversation,
  onSearch,
  searchTerm,
  onStartNewChatWithUser,
  hasActiveChat = false,
}) => {
  const { t } = useTranslation();
  const currentUser = useSelector((state) => state.login?.userInfo) || {};
  const [friendCandidates, setFriendCandidates] = useState([]);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!searchTerm || !currentUser.id) {
        setFriendCandidates([]);
        return;
      }
      try {
        const res = await handleGetFollowingByUser(currentUser.id);
        const friends = (res?.data || []).filter(
          (item) =>
            item.friend &&
            ((item.following?.userFullname || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
              (item.following?.userNickname || "")
                .toLowerCase()
                .includes(searchTerm.toLowerCase()))
        );
        setFriendCandidates(friends.map((item) => item.following));
      } catch (error) {
        console.error("Error fetching friends:", error);
        setFriendCandidates([]);
      }
    };
    fetchFriends();
  }, [searchTerm, currentUser.id]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations;

    return conversations.filter((conv) => {
      if (conv.isGroupChat) {
        return conv.name?.toLowerCase().includes(searchTerm.toLowerCase());
      }

      const otherUser = conv.participants?.find(
        (p) => (p.userId || p.id) !== currentUser?.id
      );
      return (
        otherUser &&
        (otherUser.userFullname
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          otherUser.userNickname
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()))
      );
    });
  }, [searchTerm, conversations, currentUser?.id]);

  const friendsWithoutConversation = useMemo(() => {
    if (!searchTerm || filteredConversations.length > 0) return [];

    const conversationUserIds = conversations
      .flatMap((conv) => {
        if (!conv.isGroupChat) {
          return conv.participants?.map((p) => p.userId || p.id) || [];
        }
        return [];
      })
      .filter((id) => id !== currentUser.id);

    return friendCandidates.filter(
      (user) => !conversationUserIds.includes(user.id)
    );
  }, [
    filteredConversations,
    friendCandidates,
    conversations,
    currentUser.id,
    searchTerm,
  ]);

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm", { locale: vi });
    } else if (isYesterday(date)) {
      return t("messenger.yesterday");
    } else {
      return format(date, "dd/MM/yyyy", { locale: vi });
    }
  };

  const getConversationDisplay = (conversation) => {
    if (conversation.isGroupChat) {
      return {
        name: conversation.name || t("messenger.groupChat"),
        image: "/group-avatar.png",
        isGroup: true,
        participantCount: conversation.participants?.length || 0,
      };
    }

    if (conversation.participants && conversation.participants.length > 0) {
      const otherUser = conversation.participants.find(
        (p) => (p.userId || p.id) !== currentUser?.id
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
        name: otherUserName,
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

  const TitleTag = hasActiveChat ? "h2" : "h1";

  return (
    <div className="flex h-full flex-col bg-ig-ground text-ig-text">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-ig-border px-4">
        <TitleTag className="text-[20px] font-semibold text-ig-text md:text-[24px]">
          {t("messenger.title")}
        </TitleTag>
        <button
          type="button"
          onClick={() => setShowNewConversation(true)}
          aria-label={t("messenger.createNewConversation")}
          title={t("messenger.createNewConversation")}
          className="ig-press flex h-9 w-9 items-center justify-center rounded-lg border border-ig-border bg-ig-surface text-ig-text hover:bg-ig-raised"
        >
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Ô tìm kiếm hội thoại */}
      <div className="border-b border-ig-rule p-3">
        <div className="relative">
          <Search
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ig-faint"
          />
          <input
            type="text"
            value={searchTerm}
            aria-label={t("messenger.searchConversations")}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("messenger.searchConversations")}
            className="w-full rounded-control border border-ig-border bg-ig-surface py-2 pl-9 pr-3 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Hàng ghim Trợ lý AI (/user/chat/ai) */}
      <Link
        to={Route.chat_ai}
        className={`flex h-16 shrink-0 items-center gap-3 border-b border-ig-rule px-4 transition-colors ${
          isAIChatActive ? "bg-ig-surface" : "hover:bg-ig-surface/60"
        }`}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
          <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-[14px] font-semibold text-ig-text">
              {t("aiChat.title")}
            </p>
          </div>
          <p className="truncate text-[12px] text-ig-muted">
            {t("aiChat.subtitle")}
          </p>
        </div>
      </Link>

      {/* Danh sách cuộc trò chuyện */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <RowListSkeleton count={5} rowHeight="h-16" />
        ) : filteredConversations.length === 0 &&
          friendsWithoutConversation.length === 0 ? (
          <EmptyState
            title={t("messenger.noConversations")}
            description={t("messenger.selectConversation")}
          />
        ) : (
          <>
            {filteredConversations.map((conversation) => {
              const displayInfo = getConversationDisplay(conversation);
              const isActive =
                !isAIChatActive && conversation.id === currentConversationId;
              const hasUnread = conversation.unreadCount > 0;

              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`flex h-16 w-full items-center border-b border-ig-rule px-4 text-left transition-colors ${
                    isActive ? "bg-ig-surface" : "hover:bg-ig-surface/60"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {displayInfo.isGroup ? (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
                        <Users size={18} strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    ) : (
                      <img
                        src={displayInfo.image}
                        alt={displayInfo.name || ""}
                        className="h-11 w-11 rounded-full bg-ig-surface object-cover"
                      />
                    )}
                    {hasUnread && (
                      <span
                        aria-label={`${conversation.unreadCount} unread`}
                        className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-ig-ground bg-ig-like"
                      />
                    )}
                  </div>

                  {/* Nội dung */}
                  <div className="ml-3 min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate text-[14px] ${
                          hasUnread
                            ? "font-semibold text-ig-text"
                            : "font-medium text-ig-text"
                        }`}
                      >
                        {displayInfo.name}
                        {displayInfo.isGroup && (
                          <span className="ml-1.5 text-[12px] text-ig-muted tabular-nums">
                            ({displayInfo.participantCount})
                          </span>
                        )}
                      </p>
                      {conversation.lastMessage && (
                        <span className="shrink-0 text-[12px] text-ig-faint tabular-nums">
                          {formatLastMessageTime(
                            conversation.lastMessage.createdAt
                          )}
                        </span>
                      )}
                    </div>

                    {conversation.lastMessage && (
                      <p
                        className={`truncate text-[12px] ${
                          hasUnread ? "font-medium text-ig-text" : "text-ig-muted"
                        }`}
                      >
                        {displayInfo.isGroup &&
                          conversation.lastMessage.senderId !==
                            currentUser?.id && (
                            <span className="mr-1 font-medium">
                              {conversation.participants?.find(
                                (p) =>
                                  p.userId ===
                                  conversation.lastMessage.senderId
                              )?.userNickname || "User"}
                              :
                            </span>
                          )}
                        {conversation.lastMessage.senderId === currentUser?.id
                          ? `${t("messenger.you")}: ${
                              conversation.lastMessage.content
                            }`
                          : conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Bạn bè chưa có hội thoại khi tìm kiếm */}
            {filteredConversations.length === 0 &&
              friendsWithoutConversation.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-2 text-[12px] font-medium text-ig-muted">
                    {t("messenger.noChatYetButFriend")}
                  </p>
                  {friendsWithoutConversation.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      className="flex h-16 w-full items-center px-4 text-left transition-colors hover:bg-ig-surface"
                      onClick={() =>
                        onStartNewChatWithUser &&
                        onStartNewChatWithUser(user.id)
                      }
                    >
                      <img
                        src={user.userImage || "/default-avatar.png"}
                        alt={user.userFullname || ""}
                        className="mr-3 h-11 w-11 shrink-0 rounded-full bg-ig-surface object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ig-text">
                          {user.userFullname}
                        </p>
                        <p className="truncate text-[12px] text-ig-muted">
                          @{user.userNickname}
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        strokeWidth={1.5}
                        className="text-ig-faint"
                      />
                    </button>
                  ))}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
