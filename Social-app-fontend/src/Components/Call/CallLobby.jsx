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

const handleAvatarError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = "/default-avatar.png";
};

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
    <div className="flex min-h-dvh w-full items-center justify-center bg-ig-ground p-4 text-ig-text">
      <div className="flex w-full max-w-[920px] flex-col items-center justify-center gap-6 md:flex-row md:items-stretch">
        {/* Left card: Camera & Audio Preview */}
        <div className="relative flex aspect-[4/3] w-full max-w-[520px] flex-col overflow-hidden rounded-panel border border-ig-border bg-ig-surface">
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
              <div className="flex h-full w-full flex-col items-center justify-center text-ig-muted">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-ig-border bg-ig-raised">
                  <VideoOff
                    size={28}
                    strokeWidth={1.5}
                    className="text-ig-muted"
                  />
                </div>
                <span className="text-[14px] font-medium text-ig-muted">
                  Camera off
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-ig-border bg-ig-surface py-3.5">
            <button
              type="button"
              onClick={onToggleVideo}
              aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              className={`ig-press flex h-11 w-11 items-center justify-center rounded-full ${
                isVideoEnabled
                  ? "bg-ig-raised text-ig-text hover:bg-ig-ground"
                  : "bg-ig-like/20 text-ig-like hover:bg-ig-like/30"
              }`}
            >
              {isVideoEnabled ? (
                <Video size={20} strokeWidth={1.8} />
              ) : (
                <VideoOff size={20} strokeWidth={1.8} />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleAudio}
              aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
              className={`ig-press flex h-11 w-11 items-center justify-center rounded-full ${
                isAudioEnabled
                  ? "bg-ig-raised text-ig-text hover:bg-ig-ground"
                  : "bg-ig-like/20 text-ig-like hover:bg-ig-like/30"
              }`}
            >
              {isAudioEnabled ? (
                <Mic size={20} strokeWidth={1.8} />
              ) : (
                <MicOff size={20} strokeWidth={1.8} />
              )}
            </button>

            <button
              type="button"
              onClick={onTestSpeaker}
              aria-label="Test speaker sound"
              title="Test speaker sound"
              className="ig-press flex h-11 w-11 items-center justify-center rounded-full bg-ig-raised text-ig-text hover:bg-ig-ground"
            >
              <Volume2 size={20} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Settings"
              title="Settings"
              className="ig-press flex h-11 w-11 items-center justify-center rounded-full bg-ig-raised text-ig-text hover:bg-ig-ground"
            >
              <Settings size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Right card: Target & Start Call */}
        <div className="flex w-full max-w-[360px] flex-col items-center justify-center rounded-panel border border-ig-border bg-ig-surface p-8 text-center">
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-ig-border bg-ig-raised">
            {targetInfo?.image ? (
              <img
                src={targetInfo.image}
                alt={targetInfo.name || "User"}
                onError={handleAvatarError}
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <Users size={36} className="text-ig-muted" />
            ) : (
              <img
                src="/default-avatar.png"
                alt="Avatar"
                onError={handleAvatarError}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <h2 className="mb-1 max-w-[280px] truncate text-[20px] font-semibold text-ig-text">
            {targetInfo?.name || (isGroup ? "Nhóm trò chuyện" : "Người dùng")}
          </h2>

          {isFull ? (
            <p className="mb-6 text-[13px] text-ig-like">
              Nhóm đã đạt giới hạn cuộc gọi (tối đa {maxParticipants} người).
            </p>
          ) : (
            <p className="mb-6 text-[14px] text-ig-muted">Ready to call?</p>
          )}

          <button
            type="button"
            disabled={isFull}
            onClick={onStartCall}
            className={`ig-press w-full max-w-[200px] rounded-control py-2.5 text-[14px] font-semibold text-ig-text ${
              isFull
                ? "cursor-not-allowed border border-ig-border bg-ig-raised opacity-50"
                : "bg-ig-accent hover:opacity-90"
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
