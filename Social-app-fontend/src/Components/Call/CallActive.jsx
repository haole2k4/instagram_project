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

const CallActive = ({
  currentUser,
  targetInfo,
  isGroup,
  isCalling,
  participants = [], // array of { id, name, image, stream, isMuted, isCameraOff }
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

  // Auto hide device banner after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDeviceBanner(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Update local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled, isScreenSharing]);

  // Fullscreen toggle handler
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

  // Keyboard shortcuts
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

  // Header Title & Participant Count formatting (matching Image 1 & 2)
  const getHeaderTitle = () => {
    if (!isGroup) {
      return currentUser?.userFullname || "User";
    }
    const count = participants.length + 1; // including local user
    if (count <= 2) {
      return `${currentUser?.userFullname || "User"}, + 1 other`;
    }
    return `${currentUser?.userFullname || "User"}, + ${count - 1} others`;
  };

  const totalPeopleCount = participants.length + 1;

  return (
    <div className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-black text-white select-none">
      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between p-4 md:px-8 md:py-6">
        {/* Top Left: Caller avatar & participant info */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-[#222]">
            <img
              src={currentUser?.userImage || "/default-avatar.png"}
              alt={currentUser?.userFullname || "User"}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white">
              {getHeaderTitle()}
            </div>
            {isGroup && (
              <div className="text-[12px] text-white/60">
                {totalPeopleCount} people
              </div>
            )}
          </div>
        </div>

        {/* Top Right: Actions & Device Banner */}
        <div className="flex items-center gap-3">
          {/* Connected audio device banner (matching Image 1 & 2) */}
          {showDeviceBanner && (
            <div className="hidden animate-fade-in items-center gap-2.5 rounded-full border border-white/10 bg-[#222]/90 px-4 py-2 text-[13px] text-white/90 shadow-xl backdrop-blur-md sm:flex">
              <Headphones size={16} className="text-white/80" />
              <span className="max-w-[280px] truncate">
                Connected microphone and speaker:{" "}
                <span className="font-medium text-white">
                  {audioDeviceLabel || "Analog Audio Controller"}
                </span>
              </span>
            </div>
          )}

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Settings"
            title="Settings (Alt + P)"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <Settings size={18} strokeWidth={1.8} />
          </button>

          {/* Fullscreen toggle button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen (Alt + F)" : "Enter Fullscreen (Alt + F)"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
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
        {/* Case 1: Calling / Ringing state */}
        {isCalling ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative mb-5 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-[#1c1c1c] shadow-2xl">
              <img
                src={targetInfo?.image || "/default-avatar.png"}
                alt={targetInfo?.name || "User"}
                className="h-full w-full object-cover"
              />
              {/* Subtle pulsing ring */}
              <div className="absolute inset-0 animate-ping rounded-full border border-white/20 opacity-40" />
            </div>
            <h1 className="mb-2 text-[22px] font-bold text-white">
              {targetInfo?.name || (isGroup ? "Nhóm trò chuyện" : "User")}
            </h1>
            <p className="text-[14px] text-white/60 animate-pulse">
              Calling...
            </p>
          </div>
        ) : !isGroup && participants.length === 1 ? (
          /* Case 2: 1-on-1 Connected Video or Avatar */
          <div className="relative h-full w-full max-w-5xl overflow-hidden rounded-2xl bg-[#121212]">
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
                <div className="mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-[#222]">
                  <img
                    src={participants[0].image || "/default-avatar.png"}
                    alt={participants[0].name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="text-[18px] font-semibold text-white">
                  {participants[0].name}
                </h3>
              </div>
            )}

            {/* Bottom-left name tag */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-[13px] backdrop-blur-md">
              <span>{participants[0].name}</span>
              {participants[0].isMuted && (
                <MicOff size={14} className="text-red-400" />
              )}
            </div>
          </div>
        ) : (
          /* Case 3: Group Call Grid (2 - 5 participants) */
          <div
            className={`grid h-full w-full max-w-5xl gap-4 ${
              participants.length <= 1
                ? "grid-cols-1 md:grid-cols-2"
                : participants.length <= 3
                ? "grid-cols-2"
                : "grid-cols-2 md:grid-cols-3"
            }`}
          >
            {/* Local participant tile in group */}
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#161616]">
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
                  <div className="mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-[#222]">
                    <img
                      src={currentUser?.userImage || "/default-avatar.png"}
                      alt={currentUser?.userFullname}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-[13px] text-white/70">
                    {currentUser?.userFullname} (You)
                  </span>
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-[12px] backdrop-blur-md">
                <span>You</span>
                {!isAudioEnabled && (
                  <MicOff size={12} className="text-red-400" />
                )}
              </div>
            </div>

            {/* Remote participants tiles */}
            {participants.map((p) => (
              <div
                key={p.id}
                className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#161616]"
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
                    <div className="mb-2 h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-[#222]">
                      <img
                        src={p.image || "/default-avatar.png"}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[13px] text-white/70">
                      {p.name}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-[12px] backdrop-blur-md">
                  <span>{p.name}</span>
                  {p.isMuted && <MicOff size={12} className="text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Local Video Picture-in-Picture (for 1-on-1 call only) */}
        {!isGroup && !isCalling && (
          <div className="absolute bottom-6 right-6 z-30 aspect-video w-44 overflow-hidden rounded-xl border border-white/20 bg-[#1a1a1a] shadow-2xl md:w-56">
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
                <VideoOff size={20} className="text-white/40" />
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white/80">
              You
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Control Dock (matching Image 1 & 2) */}
      <footer className="relative z-30 flex items-center justify-center pb-8 pt-2">
        <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#1e1e1e]/90 px-6 py-3 shadow-2xl backdrop-blur-lg">
          {/* Screen Share */}
          <button
            type="button"
            onClick={onToggleScreenShare}
            aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            title={isScreenSharing ? "Stop sharing screen (Alt + S)" : "Share screen (Alt + S)"}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isScreenSharing
                ? "bg-[#0095f6] text-white"
                : "bg-white/10 text-white/90 hover:bg-white/20"
            }`}
          >
            <ScreenShare size={20} strokeWidth={1.8} />
          </button>

          {/* Camera Toggle */}
          <button
            type="button"
            onClick={onToggleVideo}
            aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isVideoEnabled
                ? "bg-white/10 text-white/90 hover:bg-white/20"
                : "bg-white/20 text-white/50 hover:bg-white/30"
            }`}
          >
            {isVideoEnabled ? (
              <Video size={20} strokeWidth={1.8} />
            ) : (
              <VideoOff size={20} strokeWidth={1.8} />
            )}
          </button>

          {/* Mic Toggle */}
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
            title={isAudioEnabled ? "Mute microphone (Alt + M)" : "Unmute microphone (Alt + M)"}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              isAudioEnabled
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/20 text-white/50 hover:bg-white/30"
            }`}
          >
            {isAudioEnabled ? (
              <Mic size={20} strokeWidth={1.8} />
            ) : (
              <MicOff size={20} strokeWidth={1.8} />
            )}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            aria-label="End call"
            title="End call (Alt + E)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ff3040] text-white transition-all hover:bg-[#e02434] active:scale-95"
          >
            <PhoneOff size={20} strokeWidth={2} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default CallActive;
