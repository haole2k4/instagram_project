import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Maximize2,
  Minimize2,
  Headphones,
  ScreenShare,
} from "lucide-react";

const handleAvatarError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = "/default-avatar.png";
};

const CallActive = ({
  currentUser,
  targetInfo,
  isGroup,
  isCalling,
  participants = [],
  localStream,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  audioDeviceLabel,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onEndCall,
  onOpenSettings,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDeviceBanner, setShowDeviceBanner] = useState(true);
  const localVideoRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDeviceBanner(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled, isScreenSharing]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "e") {
          e.preventDefault();
          onEndCall();
        } else if (key === "s") {
          e.preventDefault();
          onToggleScreenShare();
        } else if (key === "f") {
          e.preventDefault();
          handleToggleFullscreen();
        } else if (key === "m") {
          e.preventDefault();
          onToggleAudio();
        } else if (key === "p") {
          e.preventDefault();
          onOpenSettings();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onEndCall,
    onToggleScreenShare,
    handleToggleFullscreen,
    onToggleAudio,
    onOpenSettings,
  ]);

  const getHeaderTitle = () => {
    if (!isGroup) {
      return currentUser?.userFullname || "User";
    }
    const count = participants.length + 1;
    if (count <= 2) {
      return `${currentUser?.userFullname || "User"}, + 1 other`;
    }
    return `${currentUser?.userFullname || "User"}, + ${count - 1} others`;
  };

  const totalPeopleCount = participants.length + 1;

  return (
    <div className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-ig-ground text-ig-text select-none">
      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between p-4 md:px-8 md:py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-ig-border bg-ig-surface">
            <img
              src={currentUser?.userImage || "/default-avatar.png"}
              alt={currentUser?.userFullname || "User"}
              onError={handleAvatarError}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ig-text">
              {getHeaderTitle()}
            </div>
            {isGroup && (
              <div className="text-[12px] text-ig-muted tabular-nums">
                {totalPeopleCount} people
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showDeviceBanner && (
            <div className="hidden items-center gap-2.5 rounded-control border border-ig-border bg-ig-raised px-4 py-2 text-[13px] text-ig-text shadow-lg sm:flex">
              <Headphones size={16} className="text-ig-muted" />
              <span className="max-w-[280px] truncate">
                Connected microphone and speaker:{" "}
                <span className="font-medium text-ig-text">
                  {audioDeviceLabel || "Analog Audio Controller"}
                </span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings (Alt + P)"
            className="ig-press flex h-9 w-9 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-muted hover:bg-ig-raised hover:text-ig-text"
          >
            <Settings size={18} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={
              isFullscreen
                ? "Exit Fullscreen (Alt + F)"
                : "Enter Fullscreen (Alt + F)"
            }
            className="ig-press flex h-9 w-9 items-center justify-center rounded-full border border-ig-border bg-ig-surface text-ig-muted hover:bg-ig-raised hover:text-ig-text"
          >
            {isFullscreen ? (
              <Minimize2 size={18} strokeWidth={1.8} />
            ) : (
              <Maximize2 size={18} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </header>

      {/* Main Center Area */}
      <main className="relative flex flex-1 items-center justify-center p-4">
        {isCalling ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-ig-border bg-ig-surface">
              <img
                src={targetInfo?.image || "/default-avatar.png"}
                alt={targetInfo?.name || "User"}
                onError={handleAvatarError}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="mb-2 text-[20px] font-semibold text-ig-text">
              {targetInfo?.name || (isGroup ? "Nhóm trò chuyện" : "User")}
            </h1>
            <p className="text-[14px] text-ig-muted">Calling...</p>
          </div>
        ) : !isGroup && participants.length === 1 ? (
          <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-panel border border-ig-border bg-ig-surface">
            {participants[0].stream && !participants[0].isCameraOff ? (
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el && participants[0].stream) {
                    el.srcObject = participants[0].stream;
                  }
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center">
                <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border border-ig-border bg-ig-raised">
                  <img
                    src={participants[0].image || "/default-avatar.png"}
                    alt={participants[0].name}
                    onError={handleAvatarError}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="text-[16px] font-semibold text-ig-text">
                  {participants[0].name}
                </h3>
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-ig-border bg-ig-ground/90 px-3 py-1.5 text-[13px]">
              <span>{participants[0].name}</span>
              {participants[0].isMuted && (
                <MicOff size={14} className="text-ig-like" />
              )}
            </div>
          </div>
        ) : (
          <div
            className={`grid h-full w-full max-w-5xl gap-4 ${
              participants.length <= 1
                ? "grid-cols-1 md:grid-cols-2"
                : participants.length <= 3
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-panel border border-ig-border bg-ig-surface">
              {isVideoEnabled && localStream ? (
                <video
                  autoPlay
                  playsInline
                  muted
                  ref={(el) => {
                    if (el && localStream) el.srcObject = localStream;
                  }}
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-2 h-16 w-16 overflow-hidden rounded-full border border-ig-border bg-ig-raised">
                    <img
                      src={currentUser?.userImage || "/default-avatar.png"}
                      alt={currentUser?.userFullname}
                      onError={handleAvatarError}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[13px] text-ig-muted">
                    {currentUser?.userFullname} (You)
                  </span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-ig-border bg-ig-ground/90 px-2.5 py-1 text-[12px]">
                <span>You</span>
                {!isAudioEnabled && (
                  <MicOff size={12} className="text-ig-like" />
                )}
              </div>
            </div>

            {participants.map((p) => (
              <div
                key={p.id}
                className="relative flex aspect-video items-center justify-center overflow-hidden rounded-panel border border-ig-border bg-ig-surface"
              >
                {p.stream && !p.isCameraOff ? (
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el && p.stream) el.srcObject = p.stream;
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-2 h-16 w-16 overflow-hidden rounded-full border border-ig-border bg-ig-raised">
                      <img
                        src={p.image || "/default-avatar.png"}
                        alt={p.name}
                        onError={handleAvatarError}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[13px] text-ig-muted">{p.name}</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg border border-ig-border bg-ig-ground/90 px-2.5 py-1 text-[12px]">
                  <span>{p.name}</span>
                  {p.isMuted && <MicOff size={12} className="text-ig-like" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isGroup && !isCalling && (
          <div className="absolute bottom-6 right-6 z-30 aspect-video w-44 overflow-hidden rounded-xl border border-ig-border bg-ig-surface shadow-lg md:w-56">
            {isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <VideoOff size={20} className="text-ig-faint" />
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 rounded bg-ig-ground/80 px-1.5 py-0.5 text-[11px] text-ig-muted">
              You
            </div>
          </div>
        )}
      </main>

      {/* Bottom Control Dock */}
      <footer className="relative z-30 flex items-center justify-center pb-8 pt-2">
        <div className="flex items-center gap-4 rounded-control border border-ig-border bg-ig-raised px-6 py-3 shadow-lg">
          <button
            type="button"
            onClick={onToggleScreenShare}
            aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            title={
              isScreenSharing
                ? "Stop sharing screen (Alt + S)"
                : "Share screen (Alt + S)"
            }
            className={`ig-press flex h-11 w-11 items-center justify-center rounded-full ${
              isScreenSharing
                ? "bg-ig-accent text-ig-text"
                : "bg-ig-surface text-ig-text hover:bg-ig-ground"
            }`}
          >
            <ScreenShare size={20} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={onToggleVideo}
            aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            className={`ig-press flex h-11 w-11 items-center justify-center rounded-full ${
              isVideoEnabled
                ? "bg-ig-surface text-ig-text hover:bg-ig-ground"
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
            title={
              isAudioEnabled
                ? "Mute microphone (Alt + M)"
                : "Unmute microphone (Alt + M)"
            }
            className={`ig-press flex h-11 w-11 items-center justify-center rounded-full ${
              isAudioEnabled
                ? "bg-ig-text text-ig-ground hover:opacity-90"
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
            onClick={onEndCall}
            aria-label="End call"
            title="End call (Alt + E)"
            className="ig-press flex h-11 w-11 items-center justify-center rounded-full bg-ig-like text-ig-text hover:opacity-90"
          >
            <PhoneOff size={20} strokeWidth={2} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CallActive;
