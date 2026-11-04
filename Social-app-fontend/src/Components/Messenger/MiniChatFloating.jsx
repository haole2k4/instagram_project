import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Maximize2,
  MessageSquare,
  Send,
  Smile,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import Picker from "emoji-picker-react";
import { toast } from "react-toastify";
import Route from "../../Components/Routes/index";
import { parseMessageContent } from "./MessageList";
import {
  getConversations,
  getMessagesByConversation,
  sendMessage,
  addMessage,
  updateConversationWithLatestMessage,
  updateMessageStatus,
  setMiniChatOpen,
  setActiveMiniConversation,
  closeMiniChat,
} from "../../Redux/Reducer/chatSlice";
import webSocketService from "../../Service/webSocketService";
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");

  const currentUser = useSelector((state) => state.login?.userInfo) || {};
  const {
    conversations = [],
    messages = [],
    loading,
    isMiniChatOpen = false,
    activeMiniConversation = null,
  } = useSelector((state) => state.chat);

  const [inputText, setInputText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentUserId = currentUser.id;
  const currentUserAvatar =
    currentUser.userImage || currentUser.avatar || "/default-avatar.png";

  useEffect(() => {
    if (currentUserId) {
      if (conversations.length === 0) {
        dispatch(getConversations(currentUserId));
      }
      webSocketService.subscribeToUserMessages().catch(() => {});
    }
  }, [currentUserId, conversations.length, dispatch]);

  useEffect(() => {
    if (activeMiniConversation?.id && currentUserId) {
      dispatch(
        getMessagesByConversation({
          conversationId: activeMiniConversation.id,
          userId: currentUserId,
        })
      );
      webSocketService.markAsRead(activeMiniConversation.id).catch(() => {});
    }
  }, [activeMiniConversation?.id, currentUserId, dispatch]);

  useEffect(() => {
    if (activeMiniConversation?.id) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeMiniConversation?.id]);

  const totalUnreadCount = useMemo(() => {
    return conversations.reduce(
      (sum, conv) => sum + (conv.unreadCount || 0),
      0
    );
  }, [conversations]);

  const getConversationDisplay = (conversation) => {
    if (!conversation) {
      return {
        name: t("messenger.untitled"),
        image: "/default-avatar.png",
        isGroup: false,
      };
    }

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
          name: otherUser.userNickname || otherUser.userFullname,
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
      name: conversation.name || t("messenger.untitled"),
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
    const targetConvId = activeMiniConversation?.id;
    dispatch(closeMiniChat());
    if (targetConvId) {
      navigate(`/user/chat/${targetConvId}`);
    } else {
      navigate(Route.chat);
    }
  };

  const handleSelectConversation = (conversation) => {
    dispatch(setActiveMiniConversation(conversation));
    setInputText("");
    setShowEmojiPicker(false);
  };

  const handleBackToList = () => {
    dispatch(setActiveMiniConversation(null));
    setInputText("");
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !activeMiniConversation?.id || !currentUserId || isSending) return;

    if (activeMiniConversation.canReceiveMessage === false) {
      toast.error(
        activeMiniConversation.restrictionMessage ||
          "This account can't receive your message because they don't allow new message requests from everyone"
      );
      return;
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const messageData = {
      tempId,
      conversationId: activeMiniConversation.id,
      senderId: currentUserId,
      content: text,
      createdAt: now,
      senderName: currentUser.userFullname || currentUser.userNickname,
      senderAvatar: currentUserAvatar,
      pending: true,
    };

    setInputText("");
    setShowEmojiPicker(false);
    dispatch(addMessage(messageData));

    setIsSending(true);
    try {
      const apiMessage = {
        conversationId: activeMiniConversation.id,
        senderId: currentUserId,
        content: text,
      };

      const resultAction = await dispatch(sendMessage(apiMessage));
      if (sendMessage.fulfilled.match(resultAction)) {
        const savedMessage = resultAction.payload;
        if (savedMessage?.id) {
          dispatch(updateConversationWithLatestMessage(savedMessage));
        }
      }
    } catch (error) {
      console.error("Error sending mini chat message:", error);
      dispatch(updateMessageStatus({ tempId, status: "failed" }));
      toast.error(
        error?.response?.data?.message ||
          (isEn ? "Failed to send message" : "Không thể gửi tin nhắn")
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    if (emojiData && emojiData.emoji) {
      setInputText((prev) => prev + emojiData.emoji);
    }
  };

  if (!currentUserId) return null;

  const activeDisplay = activeMiniConversation
    ? getConversationDisplay(activeMiniConversation)
    : null;

  const currentMessages = activeMiniConversation
    ? messages.filter((m) => m.conversationId === activeMiniConversation.id)
    : [];

  const isRestricted = activeMiniConversation?.canReceiveMessage === false;
  const restrictionNotice =
    activeMiniConversation?.restrictionMessage ||
    "This account can't receive your message because they don't allow new message requests from everyone";

  return (
    <>
      {/* Nút bấm nổi "Tin nhắn" ở góc dưới bên phải */}
      {!isMiniChatOpen && (
        <button
          type="button"
          onClick={() => dispatch(setMiniChatOpen(true))}
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

      {/* Cửa sổ Mini Chat */}
      {isMiniChatOpen && (
        <section
          aria-label={t("messenger.title")}
          className="fixed bottom-4 right-6 z-50 flex h-[520px] w-[370px] flex-col overflow-hidden rounded-2xl border border-[#2e2e2e] bg-[#121212] shadow-2xl transition-all duration-200"
        >
          {/* Topbar mini chat */}
          <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[#262626] px-3 bg-[#121212]">
            <div className="flex items-center gap-2 min-w-0">
              {activeMiniConversation ? (
                <>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    aria-label="Back"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ig-muted hover:bg-neutral-800 hover:text-white"
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </button>
                  <img
                    src={activeDisplay?.image}
                    alt=""
                    className="h-8 w-8 rounded-full bg-ig-surface object-cover shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  <h2 className="truncate text-[15px] font-bold text-white">
                    {activeDisplay?.name}
                  </h2>
                </>
              ) : (
                <>
                  <h2 className="text-[16px] font-bold text-white">
                    {t("messenger.title")}
                  </h2>
                  {totalUnreadCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ig-like px-1.5 text-[11px] font-bold text-white tabular-nums">
                      {totalUnreadCount}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Nút mở rộng sang trang tin nhắn lớn */}
              <button
                type="button"
                onClick={handleExpand}
                aria-label={t("messenger.expand")}
                title={t("messenger.expand")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted transition-colors hover:bg-ig-surface hover:text-white"
              >
                <Maximize2 size={17} strokeWidth={1.75} />
              </button>

              {/* Nút tắt cửa sổ mini chat */}
              <button
                type="button"
                onClick={() => dispatch(closeMiniChat())}
                aria-label={t("messenger.close")}
                title={t("messenger.close")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted transition-colors hover:bg-ig-surface hover:text-white"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          {/* Nội dung: Hoặc cuộc trò chuyện đang active, hoặc danh sách hội thoại */}
          {activeMiniConversation ? (
            /* VIEW 1: TRÒ CHUYỆN TRỰC TIẾP TRONG MINI CHAT */
            <div className="relative flex flex-1 flex-col overflow-hidden bg-black/40">
              {/* Vùng tin nhắn */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                {currentMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-ig-muted">
                    <img
                      src={activeDisplay?.image}
                      alt=""
                      className="mb-3 h-14 w-14 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.png";
                      }}
                    />
                    <p className="text-[14px] font-semibold text-white">
                      {activeDisplay?.name}
                    </p>
                    <p className="mt-1 text-[12px] text-neutral-400">
                      {isEn
                        ? "Say hello to start the conversation!"
                        : "Gửi tin nhắn để bắt đầu cuộc trò chuyện!"}
                    </p>
                  </div>
                ) : (
                  currentMessages.map((msg, idx) => {
                    const isMine =
                      Number(msg.senderId) === Number(currentUserId);
                    return (
                      <div
                        key={msg.id || msg.tempId || idx}
                        className={`flex items-end gap-2 ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isMine && (
                          <img
                            src={activeDisplay?.image}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = "/default-avatar.png";
                            }}
                          />
                        )}
                        {(() => {
                          const parsed = parseMessageContent(msg.content);
                          if (parsed.isPostShare) {
                            const isVideo =
                              parsed.mediaType === "VIDEO" ||
                              parsed.mediaUrl?.endsWith(".mp4");
                            return (
                              <div
                                onClick={() => navigate("/user/home")}
                                className="cursor-pointer max-w-[210px] rounded-2xl overflow-hidden border border-white/10 bg-[#1c1c1c] text-white shadow-md hover:opacity-95"
                              >
                                <div className="flex items-center gap-1.5 p-2">
                                  <img
                                    src={
                                      parsed.authorAvatar ||
                                      "/default-avatar.png"
                                    }
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "/default-avatar.png";
                                    }}
                                  />
                                  <span className="truncate text-[11px] font-semibold">
                                    {parsed.authorName}
                                  </span>
                                </div>
                                <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-900">
                                  {isVideo ? (
                                    <video
                                      src={parsed.mediaUrl}
                                      className="h-full w-full object-cover"
                                      muted
                                    />
                                  ) : (
                                    <img
                                      src={
                                        parsed.mediaUrl ||
                                        "/default-placeholder.png"
                                      }
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  )}
                                  {parsed.caption && (
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                      <p className="line-clamp-2 text-[11px] leading-tight text-white font-medium">
                                        {parsed.caption}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {parsed.text && (
                                  <div className="p-2 text-[12px] text-neutral-300">
                                    {parsed.text}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed break-words ${
                                isMine
                                  ? "bg-[#0095f6] text-white rounded-br-sm"
                                  : "bg-[#262626] text-white rounded-bl-sm"
                              } ${msg.pending ? "opacity-70" : ""}`}
                            >
                              <p>{msg.content}</p>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Vùng input hoặc thông báo chặn người lạ */}
              {isRestricted ? (
                <div className="border-t border-[#262626] bg-[#121212] p-3">
                  <div className="rounded-xl border border-amber-900/40 bg-neutral-900/95 p-3 text-center text-[12px] font-medium leading-normal text-neutral-300">
                    {restrictionNotice}
                  </div>
                </div>
              ) : (
                <div className="relative border-t border-[#262626] bg-[#121212] p-2.5">
                  {showEmojiPicker && (
                    <div className="absolute bottom-14 left-2 z-50 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                      <Picker onEmojiClick={handleEmojiClick} theme="dark" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1.5 focus-within:border-neutral-500">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      aria-label="Emoji"
                      className="text-neutral-400 hover:text-white"
                    >
                      <Smile size={18} strokeWidth={1.5} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isEn ? "Message..." : "Nhắn tin..."}
                      className="flex-1 bg-transparent text-[13px] text-white placeholder-neutral-500 outline-none"
                    />
                    {inputText.trim() && (
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={isSending}
                        className="text-[#0095f6] hover:text-[#1877f2] font-semibold text-[13px] active:scale-95"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: DANH SÁCH CUỘC TRÒ CHUYỆN */
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
                              <Users
                                size={20}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
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

                        {/* Chấm xanh khi có tin nhắn chưa đọc */}
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
          )}
        </section>
      )}
    </>
  );
};

export default MiniChatFloating;
