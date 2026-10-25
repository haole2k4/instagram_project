import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MessageListSkeleton } from "../Common/FlatSkeleton";
import EmptyState from "../Common/EmptyState";

export const parseMessageContent = (content) => {
  if (!content) return { isStoryReply: false, text: "" };
  if (typeof content === "object") {
    if (content.type === "STORY_REPLY" || content.storyMedia) {
      return {
        isStoryReply: true,
        storyMedia: content.storyMedia || content.storyUrl,
        storyType: content.storyType || "IMAGE",
        storyAuthor: content.storyAuthor || content.author || "",
        text: content.text || "",
        storyId: content.storyId,
      };
    }
  }
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === "STORY_REPLY" || parsed.storyMedia) {
          return {
            isStoryReply: true,
            storyMedia: parsed.storyMedia || parsed.storyUrl,
            storyType: parsed.storyType || "IMAGE",
            storyAuthor: parsed.storyAuthor || parsed.author || "",
            text: parsed.text || "",
            storyId: parsed.storyId,
          };
        }
      } catch {
        // Not a JSON story reply
      }
    }
  }
  return { isStoryReply: false, text: content };
};

const StoryReplyCard = ({
  storyReply,
  isSentByCurrentUser,
  formatMessageTime,
  createdAt,
  processMessageContent,
}) => {
  const { storyMedia, storyType, storyAuthor, text, storyId } = storyReply;
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col ${
        isSentByCurrentUser ? "items-end" : "items-start"
      } max-w-[85%]`}
    >
      {/* Vùng xem trước tin kèm cột dọc xám bên phải (Hình 4) */}
      <div className="flex items-stretch gap-2 mb-1.5">
        <div
          onClick={() => {
            if (storyId) navigate(`/user/story/${storyId}`);
          }}
          className="relative h-[95px] w-[145px] sm:h-[105px] sm:w-[165px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c] shadow-md select-none group"
          title="Xem tin"
        >
          {storyMedia ? (
            storyType === "VIDEO" || storyMedia.endsWith(".mp4") ? (
              <video
                src={storyMedia}
                className="h-full w-full object-cover filter blur-[2px] scale-110 transition-transform duration-300 group-hover:scale-115"
                muted
              />
            ) : (
              <img
                src={storyMedia}
                alt={storyAuthor || "Story"}
                className="h-full w-full object-cover filter blur-[2px] scale-110 transition-transform duration-300 group-hover:scale-115"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-500 text-xs">
              Tin
            </div>
          )}

          {/* Lớp phủ thông tin âm thanh / tác giả tin (Chuẩn Hình 4) */}
          <div className="absolute inset-0 flex flex-col justify-between bg-black/45 p-2.5 backdrop-blur-[1px]">
            <div className="flex items-center gap-1.5 text-white/90">
              <span className="font-mono text-[11px] font-bold tracking-tighter">
                |||
              </span>
              <span className="truncate text-[12px] font-semibold">
                {storyAuthor || "Tin"}
              </span>
            </div>
            <p className="text-[11px] text-neutral-300/90 font-medium">
              Tin đã trả lời
            </p>
          </div>
        </div>

        {/* Cột dọc màu xám ở bên phải báo hiệu tin nhắn reply (Hình 4) */}
        <div
          className="w-[3px] self-stretch rounded-full bg-neutral-500/80 my-1 shrink-0"
          title="Tin nhắn trả lời tin"
          aria-hidden="true"
        />
      </div>

      {/* Bubble tin nhắn phản hồi */}
      {text && (
        <div
          title={formatMessageTime(createdAt)}
          className={`relative max-w-full break-words rounded-2xl px-4 py-2 text-[14px] leading-5 ${
            isSentByCurrentUser
              ? "bg-ig-accent text-white"
              : "border border-ig-border bg-ig-surface text-white"
          }`}
        >
          {processMessageContent(text)}
        </div>
      )}
    </div>
  );
};

const getScrollBehavior = () => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }
  return "smooth";
};

const MessageList = ({
  messages,
  currentUserId,
  selectedUser,
  loading,
  onLoadMore,
  allLoaded,
  forceUpdate,
  isGroupChat,
  participants,
}) => {
  const { t } = useTranslation();
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isLoadingOld, setIsLoadingOld] = useState(false);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);

  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const formatTimeStamp = (currentTime, previousTime, isSenderChanged) => {
    if (!previousTime) {
      return format(new Date(currentTime), "PPPP, HH:mm", { locale: vi });
    }

    const current = new Date(currentTime);
    const previous = new Date(previousTime);
    const diffMinutes = Math.floor((current - previous) / (1000 * 60));

    if (diffMinutes >= 5 || (isSenderChanged && diffMinutes >= 1)) {
      const isSameDay = current.toDateString() === previous.toDateString();

      if (isSameDay) {
        return format(current, "HH:mm");
      }

      const diffDays = Math.floor(
        (current - previous) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 7) {
        return format(current, "EEEE, HH:mm", { locale: vi });
      } else {
        return format(current, "dd/MM/yyyy, HH:mm", { locale: vi });
      }
    }

    return null;
  };

  const isFirstInCluster = (msg, index, list) => {
    if (msg.senderId === currentUserId) return false;
    if (index === 0) return true;
    const prevMsg = list[index - 1];
    return (
      prevMsg.senderId !== msg.senderId ||
      Math.abs(new Date(msg.createdAt) - new Date(prevMsg.createdAt)) / 60000 >=
        5
    );
  };

  const isLastInCluster = (msg, index, list) => {
    if (msg.senderId === currentUserId) return false;
    if (index === list.length - 1) return true;
    const nextMsg = list[index + 1];
    return (
      nextMsg.senderId !== msg.senderId ||
      Math.abs(new Date(nextMsg.createdAt) - new Date(msg.createdAt)) / 60000 >=
        5
    );
  };

  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0 && !isLoadingOld) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [currentUserId, messages.length, isLoadingOld]);

  useEffect(() => {
    if (messages.length > 0 && messages.length > prevMessagesLength) {
      const latestMessage = messages[messages.length - 1];

      if (
        (latestMessage.senderId === currentUserId ||
          prevMessagesLength === 0) &&
        !isLoadingOld
      ) {
        messagesEndRef.current?.scrollIntoView({
          behavior: getScrollBehavior(),
        });
      }
    }

    setPrevMessagesLength(messages.length);

    if (isLoadingOld) {
      setIsLoadingOld(false);
    }
  }, [messages.length, isLoadingOld, prevMessagesLength, currentUserId, messages]);

  useEffect(() => {
    if (forceUpdate > 0 && messagesEndRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: getScrollBehavior(),
      });
    }
  }, [forceUpdate]);

  const formatMessageTime = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && !loading && !allLoaded) {
      setIsLoadingOld(true);
      const scrollHeight = e.target.scrollHeight;

      onLoadMore();

      setTimeout(() => {
        if (messagesContainerRef.current) {
          const newScrollHeight = messagesContainerRef.current.scrollHeight;
          const heightDifference = newScrollHeight - scrollHeight;
          messagesContainerRef.current.scrollTop = heightDifference;
        }
      }, 100);
    }
  };

  const getSenderInfo = (senderId) => {
    if (!participants) return null;
    return participants.find((p) => (p.userId || p.id) === senderId);
  };

  const processMessageContent = (content) => {
    if (!content) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(content)) {
      const parts = content.split(urlRegex);
      return parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-ig-text underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      );
    }
    return content;
  };

  return (
    <div
      ref={messagesContainerRef}
      className="h-full flex-1 overflow-y-auto bg-ig-ground p-4"
      onScroll={handleScroll}
    >
      {loading ? (
        <MessageListSkeleton />
      ) : (
        <>
          {allLoaded && sortedMessages.length > 0 && (
            <div className="mb-4 border-b border-ig-rule py-4 text-center text-[12px] text-ig-muted">
              <p>{t("messenger.conversationStart")}</p>
              {sortedMessages[0]?.createdAt && (
                <p className="mt-1 font-medium tabular-nums">
                  {format(new Date(sortedMessages[0].createdAt), "PPP", {
                    locale: vi,
                  })}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            {sortedMessages.map((msg, index) => {
              const isSentByCurrentUser = msg.senderId === currentUserId;
              const previousMsg = index > 0 ? sortedMessages[index - 1] : null;
              const isSenderChanged = previousMsg
                ? previousMsg.senderId !== msg.senderId
                : true;

              const timestamp = formatTimeStamp(
                msg.createdAt,
                previousMsg?.createdAt,
                isSenderChanged
              );

              const showTimestamp = Boolean(timestamp);
              const showAvatar = isLastInCluster(msg, index, sortedMessages);
              const showSenderName = isFirstInCluster(
                msg,
                index,
                sortedMessages
              );
              const sender = isGroupChat ? getSenderInfo(msg.senderId) : null;

              return (
                <React.Fragment
                  key={`${msg.id || msg.tempId}-${index}-${msg.senderId}`}
                >
                  {showTimestamp && (
                    <div className="my-2 flex justify-center">
                      <span className="px-3 py-1 text-[12px] text-ig-faint tabular-nums">
                        {timestamp}
                      </span>
                    </div>
                  )}

                  <div className="ig-msg-enter group mb-1 flex items-end">
                    {!isSentByCurrentUser && showAvatar ? (
                      <div className="shrink-0">
                        <img
                          src={
                            isGroupChat
                              ? sender?.userImage || "/default-avatar.png"
                              : selectedUser?.image || "/default-avatar.png"
                          }
                          alt=""
                          className="mr-2 h-8 w-8 rounded-full bg-ig-surface object-cover"
                        />
                      </div>
                    ) : (
                      !isSentByCurrentUser && (
                        <div className="mr-2 h-8 w-8 shrink-0" />
                      )
                    )}

                    <div className="flex w-full flex-col">
                      {isGroupChat && !isSentByCurrentUser && showSenderName && (
                        <span className="mb-1 ml-1 text-[12px] text-ig-muted">
                          {sender?.userNickname ||
                            sender?.userFullname ||
                            "User"}
                        </span>
                      )}

                      <div
                        className={`flex w-full ${
                          isSentByCurrentUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {(() => {
                          const parsed = parseMessageContent(msg.content);
                          if (parsed.isStoryReply) {
                            return (
                              <StoryReplyCard
                                storyReply={parsed}
                                isSentByCurrentUser={isSentByCurrentUser}
                                formatMessageTime={formatMessageTime}
                                createdAt={msg.createdAt}
                                processMessageContent={processMessageContent}
                              />
                            );
                          }

                          return (
                            <div
                              title={formatMessageTime(msg.createdAt)}
                              className={`relative max-w-[75%] break-words rounded-panel px-3.5 py-2 text-[14px] leading-5 ${
                                isSentByCurrentUser
                                  ? "bg-ig-accent text-ig-text"
                                  : "border border-ig-border bg-ig-surface text-ig-text"
                              } ${msg.pending ? "opacity-70" : ""}`}
                            >
                              {processMessageContent(msg.content)}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div
            ref={messagesEndRef}
            style={{ height: "1px", marginBottom: "10px" }}
          />

          {sortedMessages.length === 0 && !loading && (
            <EmptyState
              title={t("messenger.noMessages")}
              description={t("messenger.sendFirstMessage")}
            />
          )}
        </>
      )}
    </div>
  );
};

export default MessageList;
