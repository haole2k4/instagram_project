import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Info,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  getConversations,
  getMessagesByConversation,
  sendMessage,
  setActiveConversation,
  setCurrentUserId,
  addMessage,
  getOrCreateConversation,
  getMoreMessagesByConversation,
  resetChatState,
  updateMessageStatus,
  getConversationDetails,
  markMessagesAsRead,
  resetMessages,
  updateConversationWithLatestMessage,
} from "../../Redux/Reducer/chatSlice";
import webSocketService from "../../Service/WebSocketService";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UserSearchModal from "./UserSearchModal";
import AIChatPanel from "./AIChatPanel";
import { useWebSocket } from "../../Utils/configCallVideo/websocket";
import IncomingCallModal from "./IncomingCallModal";
import VideoCallModal from "./VideoCallModal";
import instance from "../../Utils/AxiosApi/Axios";
import ConversationDetails from "./ConversationDetails";
import Route from "../../Components/Routes/index";

const SearchBar = ({ searchTerm, setSearchTerm, className = "" }) => {
  const { t } = useTranslation();
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
        <Search size={16} strokeWidth={1.5} className="text-ig-faint" />
      </div>
      <input
        type="text"
        aria-label={t("messenger.searchConversationsOrFriends")}
        className="w-full rounded-control border border-ig-border bg-ig-surface py-2 pl-10 pr-9 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
        placeholder={t("messenger.searchConversationsOrFriends")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          type="button"
          aria-label={t("search.clear")}
          className="absolute inset-y-0 right-3 flex items-center text-ig-muted hover:text-ig-text"
          onClick={() => setSearchTerm("")}
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
};

const SearchResults = ({
  filteredConversations,
  friendsWithoutConversation,
  onSelectConversation,
  onStartNewChatWithUser,
  currentUser,
  searchTerm,
}) => {
  const { t } = useTranslation();

  if (!searchTerm) return null;

  return (
    <div className="py-2">
      {filteredConversations.length > 0 && (
        <div className="mb-3">
          <p className="px-3 py-1.5 text-[12px] font-medium text-ig-muted">
            {t("messenger.conversations")}
          </p>
          {filteredConversations.map((conversation) => {
            const isGroup = conversation.isGroupChat;
            const otherUser = !isGroup
              ? conversation.participants?.find(
                  (p) => (p.userId || p.id) !== currentUser?.id
                )
              : null;

            return (
              <button
                type="button"
                key={conversation.id}
                className="flex h-14 w-full items-center px-3 text-left transition-colors hover:bg-ig-surface"
                onClick={() => onSelectConversation(conversation)}
              >
                {isGroup ? (
                  <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
                    <Users size={16} strokeWidth={1.5} />
                  </div>
                ) : (
                  <img
                    src={otherUser?.userImage || "/default-avatar.png"}
                    alt=""
                    className="mr-3 h-10 w-10 rounded-full bg-ig-surface object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ig-text">
                    {isGroup
                      ? conversation.name
                      : otherUser?.userFullname || t("story.user")}
                  </p>
                  {isGroup && (
                    <p className="text-[12px] text-ig-muted tabular-nums">
                      {conversation.participants?.length || 0}{" "}
                      {t("messenger.members")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {friendsWithoutConversation.length > 0 && (
        <div>
          <p className="px-3 py-1.5 text-[12px] font-medium text-ig-muted">
            {t("messenger.friends")}
          </p>
          {friendsWithoutConversation.map((user) => (
            <button
              type="button"
              key={user.id}
              className="flex h-14 w-full items-center px-3 text-left transition-colors hover:bg-ig-surface"
              onClick={() => onStartNewChatWithUser(user.id)}
            >
              <img
                src={user.userImage || "/default-avatar.png"}
                alt=""
                className="mr-3 h-10 w-10 rounded-full bg-ig-surface object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ig-text">
                  {user.userFullname}
                </p>
                <p className="truncate text-[12px] text-ig-muted">
                  @{user.userNickname}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {filteredConversations.length === 0 &&
        friendsWithoutConversation.length === 0 && (
          <p className="py-4 text-center text-[14px] text-ig-muted">
            {t("messenger.noResultsFound")}
          </p>
        )}
    </div>
  );
};

const MessengerPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const [datafriend, setDatafriend] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  const isAIChat =
    location.pathname === Route.chat_ai || conversationId === "ai";

  const currentUser = useSelector((state) => state.login?.userInfo);
  const accessToken = useSelector((state) => state.login?.accessToken);
  const {
    conversations,
    currentConversation,
    messages,
    loading,
    webSocketConnected,
  } = useSelector((state) => state.chat);
  const {
    callUser,
    answerCall,
    leaveCall,
    receivingCall,
    callAccepted,
    isVideoCallActive,
    stream,
    remoteStream,
    name,
  } = useWebSocket();

  const [newMessage, setNewMessage] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [allLoaded, setAllLoaded] = useState(false);
  const [showConnectionWarning, setShowConnectionWarning] = useState(false);
  const [idfriend, setIdfriend] = useState(null);
  const [showFullSearch, setShowFullSearch] = useState(false);
  const [friendCandidates, setFriendCandidates] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(setCurrentUserId(currentUser.id));
      localStorage.setItem("userId", currentUser.id);
      webSocketService.init(dispatch, currentUser.id, accessToken);
      dispatch(getConversations(currentUser.id));
    }

    return () => {
      dispatch(resetChatState());
    };
  }, [currentUser?.id, accessToken, dispatch]);

  useEffect(() => {
    if (currentUser?.id && !webSocketConnected) {
      webSocketService
        .connect()
        .then(() => {
          return webSocketService.subscribeToUserMessages();
        })
        .catch((err) => {
          console.error("Failed to connect WebSocket:", err);
        });
    }
  }, [currentUser?.id, webSocketConnected]);

  useEffect(() => {
    if (isAIChat) {
      dispatch(resetMessages());
      dispatch({ type: "chat/setActiveConversation", payload: null });
      return;
    }

    if (conversationId && currentUser?.id) {
      const conversationIdInt = parseInt(conversationId, 10);
      if (Number.isNaN(conversationIdInt)) return;

      setPage(1);
      setAllLoaded(false);

      instance
        .get(
          `/chat/check-access?conversationId=${conversationIdInt}&userId=${currentUser.id}`
        )
        .then((response) => {
          if (response.data?.hasAccess) {
            dispatch(setActiveConversation(conversationIdInt));
            dispatch(
              getConversationDetails({
                conversationId: conversationIdInt,
                userId: currentUser.id,
              })
            );
            dispatch(
              getMessagesByConversation({
                conversationId: conversationIdInt,
                userId: currentUser.id,
                page: 0,
                size: 20,
              })
            );
          } else {
            navigate("/user/chat");
          }
        })
        .catch((error) => {
          console.error("Error checking conversation access:", error);
          navigate("/user/chat");
        });
    } else if (currentUser?.id) {
      dispatch(resetMessages());
      dispatch({ type: "chat/setActiveConversation", payload: null });
    }
  }, [conversationId, isAIChat, currentUser?.id, dispatch, navigate]);

  useEffect(() => {
    if (!conversationId && !isAIChat && currentUser?.id) {
      dispatch(resetMessages());
      dispatch({ type: "chat/setActiveConversation", payload: null });
    }
  }, [conversationId, isAIChat, currentUser?.id, dispatch]);

  useEffect(() => {
    if (!isAIChat && currentConversation?.id && currentUser?.id) {
      setPage(0);
      setAllLoaded(false);
      dispatch(
        getConversationDetails({
          conversationId: currentConversation.id,
          userId: currentUser.id,
        })
      );
      dispatch(
        getMessagesByConversation({
          conversationId: currentConversation.id,
          userId: currentUser.id,
          page: 0,
          size: 20,
        })
      );
    }
  }, [currentConversation?.id, currentUser?.id, isAIChat, dispatch]);

  useEffect(() => {
    if (!webSocketConnected && currentConversation && !isAIChat) {
      const timer = setTimeout(() => {
        setShowConnectionWarning(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowConnectionWarning(false);
    }
  }, [webSocketConnected, currentConversation, isAIChat]);

  useEffect(() => {
    if (currentConversation?.id && currentUser?.id && !isAIChat) {
      const connectAndSubscribe = async (retries = 3) => {
        try {
          if (!webSocketConnected) {
            try {
              await webSocketService.connect();
            } catch (err) {
              console.error("WebSocket connection failed:", err);
            }
          }
          if (currentConversation.unreadCount > 0 && webSocketConnected) {
            await webSocketService.markAsRead(currentConversation.id);
          }
        } catch (error) {
          if (retries > 0) {
            setTimeout(() => connectAndSubscribe(retries - 1), 1000);
          }
        }
      };

      connectAndSubscribe();
    }
  }, [
    currentConversation?.id,
    currentConversation?.unreadCount,
    currentUser?.id,
    webSocketConnected,
    isAIChat,
  ]);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimer = null;

    const attemptReconnect = async () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        setShowConnectionWarning(true);
        return;
      }

      if (currentUser?.id && !webSocketConnected) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

        try {
          await webSocketService.connect();
          reconnectAttempts = 0;
          setShowConnectionWarning(false);
        } catch (err) {
          reconnectTimer = setTimeout(attemptReconnect, delay);
        }
      }
    };

    if (currentUser?.id && !webSocketConnected) {
      attemptReconnect();
    } else {
      setShowConnectionWarning(false);
    }

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [currentUser?.id, webSocketConnected]);

  useEffect(() => {
    let messageRefreshInterval;

    if (currentConversation?.id && currentUser?.id && !isAIChat) {
      messageRefreshInterval = setInterval(() => {
        if (!webSocketConnected) {
          dispatch(
            getMessagesByConversation({
              conversationId: currentConversation.id,
              userId: currentUser.id,
              page: 0,
              size: 20,
            })
          );
        }
      }, 10000);
    }

    return () => {
      if (messageRefreshInterval) {
        clearInterval(messageRefreshInterval);
      }
    };
  }, [
    currentConversation?.id,
    currentUser?.id,
    webSocketConnected,
    isAIChat,
    dispatch,
  ]);

  useEffect(() => {
    if (messageInputRef.current && currentConversation && !isAIChat) {
      setTimeout(() => {
        try {
          messageInputRef.current.focus();
        } catch {
          // ignore
        }
      }, 100);
    }
  }, [currentConversation, isAIChat]);

  const handleSelectConversation = useCallback(
    (conversation) => {
      if (!conversation || !conversation.id) return;

      dispatch({ type: "chat/setLoading", payload: true });
      dispatch(resetMessages());
      dispatch(setActiveConversation(conversation.id));
      navigate(`/user/chat/${conversation.id}`);

      if (currentUser?.id) {
        dispatch(
          getConversationDetails({
            conversationId: conversation.id,
            userId: currentUser.id,
          })
        );
        dispatch(
          getMessagesByConversation({
            conversationId: conversation.id,
            userId: currentUser.id,
            page: 0,
            size: 20,
          })
        );
      }

      if (
        conversation.unreadCount > 0 &&
        currentUser?.id &&
        webSocketConnected
      ) {
        webSocketService.markAsRead(conversation.id).catch(() => {
          dispatch(
            markMessagesAsRead({
              conversationId: conversation.id,
              userId: currentUser.id,
            })
          );
        });
      }
    },
    [navigate, currentUser?.id, webSocketConnected, dispatch]
  );

  const handleNewConversation = useCallback(
    async (userId) => {
      if (!currentUser?.id || !userId) return;

      try {
        const resultAction = await dispatch(
          getOrCreateConversation({
            userId: currentUser.id,
            otherUserId: userId,
          })
        );

        if (
          getOrCreateConversation.fulfilled.match(resultAction) &&
          resultAction.payload
        ) {
          navigate(`/user/chat/${resultAction.payload.id}`);
          setShowNewConversation(false);
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
      }
    },
    [currentUser?.id, dispatch, navigate]
  );

  const handleSendMessage = async (customContent) => {
    const messageContent = customContent || newMessage.trim();
    if (!messageContent || !currentConversation?.id || !currentUser?.id) return;

    if (!customContent) {
      setNewMessage("");
    }

    const tempId = `temp-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const messageData = {
      tempId,
      conversationId: currentConversation.id,
      senderId: currentUser.id,
      content: messageContent,
      createdAt: now,
      senderName: currentUser.userFullname,
      senderAvatar: currentUser.userImage || "/default-avatar.png",
      pending: true,
    };

    setNewMessage("");
    dispatch(addMessage(messageData));
    setForceUpdate((prev) => prev + 1);

    try {
      const apiMessage = {
        conversationId: currentConversation.id,
        senderId: currentUser.id,
        content: messageData.content,
      };

      if (!webSocketConnected) {
        try {
          await webSocketService.connect();
        } catch {
          // proceed with HTTP API
        }
      }

      const resultAction = await dispatch(sendMessage(apiMessage));

      if (sendMessage.fulfilled.match(resultAction)) {
        const savedMessage = resultAction.payload;
        if (savedMessage?.id) {
          dispatch(updateConversationWithLatestMessage(savedMessage));
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      dispatch(
        updateMessageStatus({
          tempId,
          status: "failed",
        })
      );
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (!currentConversation?.id || !currentUser?.id || loading || allLoaded)
      return;

    try {
      const nextPage = page + 1;
      const resultAction = await dispatch(
        getMoreMessagesByConversation({
          conversationId: currentConversation.id,
          userId: currentUser.id,
          page: nextPage,
          size: 20,
        })
      );

      if (getMoreMessagesByConversation.fulfilled.match(resultAction)) {
        const payload = resultAction.payload || [];
        if (payload.length === 0) {
          setAllLoaded(true);
        } else {
          setPage(nextPage);
        }
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    }
  }, [
    currentConversation?.id,
    currentUser?.id,
    page,
    loading,
    allLoaded,
    dispatch,
  ]);

  const handleCreateGroup = async ({ name: groupName, userIds }) => {
    try {
      const res = await instance.post("/chat/group", {
        name: groupName,
        userIds,
      });
      if (res.data && res.data.id) {
        navigate(`/user/chat/${res.data.id}`);
        setShowNewConversation(false);
        dispatch(getConversations(currentUser.id));
      }
    } catch (e) {
      console.error("Error creating group:", e);
    }
  };

  const filteredConversations = searchTerm
    ? conversations.filter((conv) => {
        if (conv.isGroupChat) {
          return conv.name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        const otherUser = conv.participants?.find(
          (p) => (p.userId || p.id) !== currentUser?.id
        );
        return (
          otherUser?.userFullname
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          otherUser?.userNickname
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      })
    : conversations;

  const getConversationHeader = () => {
    if (!currentConversation) return null;

    if (currentConversation.isGroupChat) {
      return {
        name: currentConversation.name || t("messenger.groupChat"),
        image: "/group-avatar.png",
        isGroup: true,
        participantCount: currentConversation.participants?.length || 0,
      };
    }

    if (currentConversation.participants) {
      const otherUser = currentConversation.participants.find(
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

    if (
      currentConversation.name &&
      currentConversation.name.includes("between")
    ) {
      const nameParts = currentConversation.name
        .replace("Chat between ", "")
        .split(" and ");
      const otherUserName = nameParts.find(
        (part) =>
          !part
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

  useEffect(() => {
    if (currentConversation?.participants) {
      const idFr = currentConversation.participants.find(
        (p) => (p.userId || p.id) !== currentUser?.id
      );
      setDatafriend(idFr);
      setIdfriend(idFr?.userId || idFr?.id);
    }
  }, [currentConversation, currentUser?.id]);

  const headerInfo = getConversationHeader();

  const handleVideoCall = async () => {
    try {
      await callUser(idfriend);
    } catch (error) {
      console.error("Error starting video call:", error);
    }
  };

  const handleAcceptCall = async () => {
    try {
      await answerCall();
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleRejectCall = () => {
    leaveCall();
  };

  const handleEndCall = () => {
    leaveCall();
  };

  const handleMarkAsRead = () => {
    if (currentConversation && currentUser?.id) {
      dispatch(
        markMessagesAsRead({
          conversationId: currentConversation.id,
          userId: currentUser.id,
        })
      );
    }
  };

  useEffect(() => {
    const fetchFriends = async () => {
      if (!searchTerm || !currentUser?.id) {
        setFriendCandidates([]);
        return;
      }

      try {
        const followingRes = await instance.get(
          `/follow/following/${currentUser.id}`
        );
        const followingData = followingRes.data || [];

        const friends = followingData
          .filter((item) => item.friend === true)
          .map((item) => item.following)
          .filter(
            (friend) =>
              friend.userFullname
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              friend.userNickname
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          );

        const conversationUserIds = conversations
          .filter((conv) => !conv.isGroupChat)
          .flatMap((conv) =>
            conv.participants
              ?.filter((p) => (p.userId || p.id) !== currentUser.id)
              .map((p) => p.userId || p.id)
          );

        const friendsWithoutConversations = friends.filter(
          (friend) => !conversationUserIds.includes(friend.id)
        );

        setFriendCandidates(friendsWithoutConversations);
      } catch (error) {
        console.error("Error fetching friends:", error);
        setFriendCandidates([]);
      }
    };

    fetchFriends();
  }, [searchTerm, currentUser?.id, conversations]);

  useEffect(() => {
    if (
      currentConversation &&
      !currentConversation.isGroupChat &&
      currentConversation.participants?.length === 2
    ) {
      const otherUser = currentConversation.participants.find(
        (p) => (p.userId || p.id) !== currentUser?.id
      );

      if (otherUser && currentUser) {
        checkBlockStatus(otherUser.userId || otherUser.id, currentUser.id);
      }
    } else {
      setIsUserBlocked(false);
    }
  }, [currentConversation, currentUser]);

  const checkBlockStatus = async (otherUserId, userId) => {
    try {
      const response = await instance.get(
        `/chat/block-status?userId=${userId}&otherUserId=${otherUserId}`
      );
      setIsUserBlocked(response.data?.isBlocked || false);
    } catch (error) {
      console.error("Error checking block status:", error);
      setIsUserBlocked(false);
    }
  };

  const hasActivePane = Boolean(isAIChat || currentConversation);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full bg-ig-ground text-ig-text md:h-dvh">
      {/* Cột danh sách hội thoại */}
      <div
        className={`${
          hasActivePane ? "hidden md:block" : "block w-full"
        } border-r border-ig-border bg-ig-ground md:w-[360px] lg:w-[380px] shrink-0`}
      >
        <ConversationList
          conversations={filteredConversations}
          currentConversationId={currentConversation?.id}
          isAIChatActive={isAIChat}
          onSelectConversation={handleSelectConversation}
          loading={loading}
          setShowNewConversation={setShowNewConversation}
          onSearch={setSearchTerm}
          searchTerm={searchTerm}
          onStartNewChatWithUser={handleNewConversation}
          currentUser={currentUser}
          hasActiveChat={hasActivePane}
        />
      </div>

      {/* Vùng hội thoại chính */}
      <div
        className={`${
          hasActivePane ? "flex" : "hidden md:flex"
        } min-w-0 flex-1 flex-col bg-ig-ground`}
      >
        {isAIChat ? (
          <AIChatPanel />
        ) : currentConversation ? (
          <>
            {/* Header hội thoại */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-ig-border px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(Route.chat)}
                  aria-label={t("messenger.back")}
                  title={t("messenger.back")}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text md:hidden"
                >
                  <ChevronLeft size={20} strokeWidth={1.5} />
                </button>
                {headerInfo?.isGroup ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
                    <Users size={18} strokeWidth={1.5} />
                  </div>
                ) : (
                  <img
                    src={headerInfo?.image || "/default-avatar.png"}
                    alt={headerInfo?.name || ""}
                    className="h-10 w-10 shrink-0 rounded-full bg-ig-surface object-cover"
                  />
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-[20px] font-semibold leading-tight text-ig-text md:text-[24px]">
                    {headerInfo?.name}
                  </h1>
                  {headerInfo?.isGroup && (
                    <p className="text-[12px] text-ig-muted tabular-nums">
                      {headerInfo.participantCount} {t("messenger.members")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("messenger.voiceCall")}
                  title={t("messenger.voiceCall")}
                  onClick={handleVideoCall}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
                >
                  <Phone size={18} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  aria-label={t("messenger.videoCall")}
                  title={t("messenger.videoCall")}
                  onClick={handleVideoCall}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
                >
                  <Video size={18} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  aria-label={t("messenger.details")}
                  title={t("messenger.details")}
                  aria-expanded={showDetails}
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
                >
                  <Info size={18} strokeWidth={1.5} />
                </button>
              </div>
            </header>

            {showConnectionWarning && (
              <div className="flex items-center justify-between border-b border-ig-border bg-ig-surface px-4 py-2.5 text-[12px]">
                <span className="text-ig-muted">
                  {t("messenger.connectionLost")}
                </span>
                <button
                  type="button"
                  onClick={() => webSocketService.connect()}
                  className="font-semibold text-ig-accent hover:opacity-85"
                >
                  {t("messenger.reconnect")}
                </button>
              </div>
            )}

            {/* Danh sách tin nhắn */}
            <div className="flex-1 overflow-hidden">
              <MessageList
                messages={messages}
                currentUserId={currentUser?.id}
                selectedUser={headerInfo}
                loading={loading}
                onLoadMore={handleLoadMore}
                allLoaded={allLoaded}
                forceUpdate={forceUpdate}
                isGroupChat={currentConversation.isGroupChat}
                participants={currentConversation.participants}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Ô nhập tin nhắn */}
            <MessageInput
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onSend={handleSendMessage}
              inputRef={messageInputRef}
              isBlocked={isUserBlocked}
              onFocus={handleMarkAsRead}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-text">
              <MessageSquare size={24} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-1 text-[16px] font-medium text-ig-text">
              {t("messenger.welcomeToChat")}
            </h2>

            {!showFullSearch ? (
              <>
                <p className="mb-6 max-w-sm text-[14px] text-ig-muted">
                  {t("messenger.selectConversation")}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewConversation(true)}
                    className="ig-press inline-flex items-center gap-2 rounded-control bg-ig-accent px-5 py-2.5 text-[14px] font-semibold text-ig-text hover:opacity-90"
                  >
                    <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
                    {t("messenger.newConversation")}
                  </button>

                  <Link
                    to={Route.chat_ai}
                    className="ig-press inline-flex items-center gap-2 rounded-control border border-ig-border bg-ig-surface px-5 py-2.5 text-[14px] font-semibold text-ig-text hover:bg-ig-raised"
                  >
                    <Sparkles size={16} strokeWidth={1.5} aria-hidden="true" />
                    {t("aiChat.title")}
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-4 w-full max-w-md text-left">
                <SearchBar
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  className="mb-3"
                />

                {searchTerm && (
                  <div className="max-h-80 overflow-y-auto rounded-panel border border-ig-border bg-ig-surface">
                    <SearchResults
                      filteredConversations={filteredConversations}
                      friendsWithoutConversation={friendCandidates}
                      onSelectConversation={handleSelectConversation}
                      onStartNewChatWithUser={handleNewConversation}
                      currentUser={currentUser}
                      searchTerm={searchTerm}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-ig-muted hover:text-ig-text"
                  onClick={() => {
                    setShowFullSearch(false);
                    setSearchTerm("");
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                  {t("messenger.back")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal tạo hội thoại / nhóm */}
      <UserSearchModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onSelectUser={handleNewConversation}
        onCreateGroup={handleCreateGroup}
        currentUserId={currentUser?.id}
      />

      {receivingCall && !callAccepted && (
        <IncomingCallModal
          caller={{
            userFullname: name,
            userImage: datafriend?.userImage,
          }}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {isVideoCallActive && (
        <VideoCallModal
          stream={stream}
          remoteStream={remoteStream}
          onEndCall={handleEndCall}
          callAccepted={callAccepted}
          name={name}
        />
      )}

      {showDetails && currentConversation && !isAIChat && (
        <div className="w-80 shrink-0">
          <ConversationDetails
            conversation={currentConversation}
            onClose={() => setShowDetails(false)}
            currentUser={currentUser}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(MessengerPage);
