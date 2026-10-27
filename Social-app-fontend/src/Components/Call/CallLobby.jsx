import React, { useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  Settings,
  Users,
} from "lucide-react";

const CallLobby = ({
  targetInfo,
  isGroup,
  localStream,
  isVideoEnabled,
  isAudioEnabled,
  onToggleVideo,
  onToggleAudio,
  onTestSpeaker,
  onOpenSettings,
  onStartCall,
  participantCount = 1,
  maxParticipants = 5,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  const isFull = isGroup && participantCount > maxParticipants;

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-black p-4 text-white">
      <div className="flex w-full max-w-[920px] flex-col items-center justify-center gap-6 md:flex-row md:items-stretch">
        {/* Left card: Camera & Audio Preview */}
        <div className="relative flex aspect-[4/3] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl">
          {/* Video display */}
          <div className="relative flex-1">
            {isVideoEnabled && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center text-white/70">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <VideoOff size={28} strokeWidth={1.5} className="text-white/60" />
                </div>
                <span className="text-[14px] font-medium text-white/70">
                  Camera off
                </span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-3 bg-[#181818]/90 py-3.5 backdrop-blur-md">
            {/* Video toggle */}
            <button
              type="button"
              onClick={onToggleVideo}
              aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                isVideoEnabled
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {isVideoEnabled ? (
                <Video size={20} strokeWidth={1.8} />
              ) : (
                <VideoOff size={20} strokeWidth={1.8} />
              )}
            </button>

            {/* Mic toggle */}
            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                isAudioEnabled
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              }`}
            >
              {isAudioEnabled ? (
                <Mic size={20} strokeWidth={1.8} />
              ) : (
                <MicOff size={20} strokeWidth={1.8} />
              )}
            </button>

            {/* Speaker test */}
            <button
              type="button"
              onClick={onTestSpeaker}
              aria-label="Test speaker sound"
              title="Test speaker sound"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Volume2 size={20} strokeWidth={1.8} />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Settings"
              title="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Settings size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Right card: Target & Start Call */}
        <div className="flex w-full max-w-[360px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#181818] p-8 text-center shadow-2xl">
          {/* Avatar */}
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 bg-[#242424] shadow-md">
            {targetInfo?.image ? (
              <img
                src={targetInfo.image}
                alt={targetInfo.name || "User"}
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <Users size={36} className="text-white/60" />
            ) : (
              <img
                src="/default-avatar.png"
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Name */}
          <h2 className="mb-1 max-w-[280px] truncate text-[20px] font-bold text-white">
            {targetInfo?.name || (isGroup ? "Nhóm trò chuyện" : "Người dùng")}
          </h2>

          {/* Subtitle / Limit message */}
          {isFull ? (
            <p className="mb-6 text-[13px] text-red-400">
              Nhóm đã đạt giới hạn cuộc gọi (tối đa {maxParticipants} người).
            </p>
          ) : (
            <p className="mb-6 text-[14px] text-white/70">
              Ready to call?
            </p>
          )}

          {/* Start call button */}
          <button
            type="button"
            disabled={isFull}
            onClick={onStartCall}
            className={`w-full max-w-[200px] rounded-full py-2.5 text-[15px] font-semibold text-white shadow-md transition-all ${
              isFull
                ? "cursor-not-allowed bg-white/20 opacity-50"
                : "bg-[#0095f6] hover:bg-[#1877f2] hover:shadow-lg active:scale-95"
            }`}
          >
            Start call
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallLobby;
