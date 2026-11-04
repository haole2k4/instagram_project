import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { X, Search, Check, Users } from "lucide-react";
import {
  getConversations,
  sendMessage,
  updateConversationWithLatestMessage,
} from "../../../Redux/Reducer/chatSlice";
import { toast } from "react-toastify";

const SharePostModal = ({ isOpen, onClose, post }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.user.user);
  const { conversations } = useSelector((state) => state.chat);

  const [searchTerm, setSearchTerm] = useState("");
  const [extraText, setExtraText] = useState("");
  const [sentMap, setSentMap] = useState({});
  const [sendingMap, setSendingMap] = useState({});

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      dispatch(getConversations(currentUser.id));
      setSentMap({});
      setSendingMap({});
      setExtraText("");
      setSearchTerm("");
    }
  }, [isOpen, currentUser?.id, dispatch]);

  const conversationList = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return conversations.map((conv) => {
      if (conv.isGroupChat) {
        return {
          id: conv.id,
          name: conv.name || (isEn ? "Group Chat" : "Nhóm trò chuyện"),
          image: "/group-avatar.png",
          isGroup: true,
          subtitle: `${conv.participants?.length || 0} ${
            isEn ? "members" : "thành viên"
          }`,
        };
      }
      const other = conv.participants?.find(
        (p) => Number(p.userId || p.id) !== Number(currentUser?.id)
      );
      return {
        id: conv.id,
        name: other?.userFullname || other?.userNickname || (isEn ? "User" : "Người dùng"),
        username: other?.userNickname || "",
        image: other?.userImage || "/default-avatar.png",
        isGroup: false,
        subtitle: other?.userNickname ? `@${other.userNickname}` : "",
      };
    });
  }, [conversations, currentUser?.id, isEn]);

  const filteredConversations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return conversationList;
    return conversationList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q))
    );
  }, [conversationList, searchTerm]);

  if (!isOpen || !post) return null;

  const handleSendPost = async (conv) => {
    if (!currentUser?.id || !conv.id) return;
    if (sentMap[conv.id] || sendingMap[conv.id]) return;

    setSendingMap((prev) => ({ ...prev, [conv.id]: true }));

    const postAuthor =
      post.user?.userNickname ||
      post.user?.userFullname ||
      post.username ||
      "instagram_user";
    const postAvatar = post.user?.userImage || "/default-avatar.png";
    const mediaItem = post.media?.[0];
    const mediaUrl = mediaItem?.url || "";
    const isVideo = mediaUrl.endsWith(".mp4");

    const payload = JSON.stringify({
      type: "POST_SHARE",
      postId: post.id,
      authorName: postAuthor,
      authorAvatar: postAvatar,
      mediaUrl: mediaUrl,
      mediaType: isVideo ? "VIDEO" : "IMAGE",
      caption: post.title || "",
      extraText: extraText.trim(),
    });

    try {
      const resultAction = await dispatch(
        sendMessage({
          conversationId: conv.id,
          senderId: currentUser.id,
          content: payload,
        })
      );

      if (sendMessage.fulfilled.match(resultAction)) {
        const savedMessage = resultAction.payload;
        if (savedMessage?.id) {
          dispatch(updateConversationWithLatestMessage(savedMessage));
        }
        setSentMap((prev) => ({ ...prev, [conv.id]: true }));
        toast.success(
          isEn
            ? `Post shared to ${conv.name}!`
            : `Đã chia sẻ bài viết tới ${conv.name}!`
        );
      } else {
        toast.error(isEn ? "Failed to share post" : "Không thể chia sẻ bài viết");
      }
    } catch (err) {
      console.error("Error sharing post:", err);
      toast.error(isEn ? "Failed to share post" : "Không thể chia sẻ bài viết");
    } finally {
      setSendingMap((prev) => ({ ...prev, [conv.id]: false }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[520px] w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#262626] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="w-6" />
          <h2 className="text-[16px] font-semibold text-center">
            {isEn ? "Share post" : "Chia sẻ bài viết"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/10 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-[#1c1c1c] px-3 py-2 text-[14px]">
            <Search size={16} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isEn
                  ? "Search people or groups..."
                  : "Tìm kiếm người dùng hoặc nhóm..."
              }
              className="w-full bg-transparent text-white placeholder-neutral-400 outline-none text-[13px]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-neutral-400">
              <Users size={32} className="mb-2 text-neutral-500" />
              <p className="text-[14px] font-medium">
                {isEn ? "No conversations found" : "Không tìm thấy cuộc trò chuyện nào"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSent = Boolean(sentMap[conv.id]);
              const isSending = Boolean(sendingMap[conv.id]);

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between rounded-xl p-2.5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {conv.isGroup ? (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white">
                        <Users size={20} strokeWidth={1.5} />
                      </div>
                    ) : (
                      <img
                        src={conv.image}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-full object-cover bg-neutral-800"
                        onError={(e) => {
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-white">
                        {conv.name}
                      </p>
                      <p className="truncate text-[12px] text-neutral-400">
                        {conv.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSent || isSending}
                    onClick={() => handleSendPost(conv)}
                    className={`shrink-0 rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all ${
                      isSent
                        ? "bg-white/10 text-neutral-300 cursor-default flex items-center gap-1"
                        : "bg-[#0095f6] text-white hover:opacity-90 active:scale-95"
                    }`}
                  >
                    {isSending ? (
                      "..."
                    ) : isSent ? (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>{isEn ? "Sent" : "Đã gửi"}</span>
                      </>
                    ) : (
                      <span>{isEn ? "Send" : "Gửi"}</span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Optional note input */}
        <div className="border-t border-white/10 p-3 bg-[#1e1e1e]">
          <input
            type="text"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            placeholder={
              isEn ? "Write a message..." : "Viết tin nhắn kèm theo..."
            }
            className="w-full rounded-xl bg-[#262626] border border-white/10 px-3 py-2 text-[13px] text-white placeholder-neutral-400 outline-none focus:border-[#0095f6]"
          />
        </div>
      </div>
    </div>
  );
};

export default SharePostModal;
