import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import instance from "../../Utils/AxiosApi/Axios";
import webSocketService from "../../Service/WebSocketService";
import CallLobby from "../../Components/Call/CallLobby";
import CallActive from "../../Components/Call/CallActive";
import CallSettingsModal from "../../Components/Call/CallSettingsModal";
import { useCallManager } from "../../Utils/configCallVideo/useCallManager";

const CallPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentUser = useSelector((state) => state.login?.userInfo);
  const accessToken = useSelector((state) => state.login?.accessToken);

  const initialHasVideo = searchParams.get("has_video") === "true";
  const conversationId = searchParams.get("ig_thread_id");
  const autoJoin = searchParams.get("auto_join") === "true";

  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize WebSocket connection if not already connected
  useEffect(() => {
    if (currentUser?.id) {
      webSocketService.init(undefined, currentUser.id, accessToken);
      webSocketService.connect().catch((e) =>
        console.warn("WebSocket connect error on CallPage:", e)
      );
    }
  }, [currentUser?.id, accessToken]);

  // Fetch conversation information
  useEffect(() => {
    let isMounted = true;
    const fetchConversation = async () => {
      if (!conversationId || !currentUser?.id) return;
      try {
        const res = await instance.get(
          `/api/v1/chat/conversation/${conversationId}?userId=${currentUser.id}`
        );
        if (isMounted && res.data) {
          setConversation(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch conversation for call:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConversation();
    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUser?.id]);

  const isGroup = Boolean(conversation?.isGroupChat);

  // Identify the target recipient (for 1-on-1) or group details
  const targetUser = useMemo(() => {
    if (!conversation) return null;
    if (isGroup) {
      return {
        name: conversation.name || "Nhóm trò chuyện",
        image: null,
      };
    }
    const other = conversation.participants?.find(
      (p) => String(p.userId || p.id) !== String(currentUser?.id)
    );
    return other
      ? {
          userId: other.userId || other.id,
          name: other.userFullname || other.userNickname || "User",
          image: other.userImage || "/default-avatar.png",
        }
      : null;
  }, [conversation, isGroup, currentUser?.id]);

  const handleCallEnded = useCallback(() => {
    setTimeout(() => {
      if (window.opener && window.opener !== window) {
        window.close();
      } else {
        navigate(
          conversationId ? `/user/chat/${conversationId}` : "/user/chat",
          { replace: true }
        );
      }
    }, 1000);
  }, [conversationId, navigate]);

  const {
    callState,
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    participants,
    audioDevices,
    audioOutputDevices,
    selectedAudioDeviceId,
    selectedAudioOutputId,
    audioDeviceLabel,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    selectAudioDevice,
    selectAudioOutput,
    testSpeaker,
  } = useCallManager({
    currentUser,
    conversationId,
    isGroup,
    targetUser,
    initialHasVideo,
    autoJoin,
    onCallEnded: handleCallEnded,
  });

  if (loading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#0095f6]" />
          <span className="text-[13px] text-white/60">Đang chuẩn bị cuộc gọi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black font-sans text-white">
      {callState === "LOBBY" ? (
        <CallLobby
          targetInfo={targetUser}
          isGroup={isGroup}
          localStream={localStream}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onTestSpeaker={testSpeaker}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onStartCall={startCall}
          participantCount={conversation?.participants?.length || 1}
          maxParticipants={5}
        />
      ) : (
        <CallActive
          currentUser={currentUser}
          targetInfo={targetUser}
          isGroup={isGroup}
          isCalling={callState === "CALLING"}
          participants={participants}
          localStream={localStream}
          isVideoEnabled={isVideoEnabled}
          isAudioEnabled={isAudioEnabled}
          isScreenSharing={isScreenSharing}
          audioDeviceLabel={audioDeviceLabel}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreenShare={toggleScreenShare}
          onEndCall={endCall}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Settings Modal (Image 3) */}
      <CallSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        audioDevices={audioDevices}
        audioOutputDevices={audioOutputDevices}
        selectedAudioDeviceId={selectedAudioDeviceId}
        selectedAudioOutputId={selectedAudioOutputId}
        onSelectAudioDevice={selectAudioDevice}
        onSelectAudioOutput={selectAudioOutput}
      />
    </div>
  );
};

export default CallPage;
