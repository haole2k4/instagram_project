import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

const VideoCallModal = ({
  stream,
  remoteStream,
  onEndCall,
  callAccepted,
  name,
}) => {
  const { t } = useTranslation();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(true);

  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("messenger.videoCall")}
      className="fixed inset-0 z-50 bg-ig-ground"
    >
      <div className="relative h-full w-full">
        {/* Remote Video */}
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          {(!remoteStream || !callAccepted) && (
            <div className="absolute inset-0 flex items-center justify-center bg-ig-ground">
              <div className="text-center text-ig-text">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-ig-border bg-ig-surface">
                  <Video size={24} strokeWidth={1.5} />
                </div>
                <p className="text-[14px] text-ig-muted">
                  {t("messenger.waitingForRemoteVideo")}
                </p>
              </div>
            </div>
          )}
          {callAccepted && (
            <div className="absolute bottom-6 left-6 rounded-control border border-ig-border bg-ig-ground/80 px-3 py-1.5 text-[14px] text-ig-text">
              {name || t("story.user")}
            </div>
          )}
        </div>

        {/* Local Video */}
        <div className="absolute right-4 top-4 aspect-video w-56 overflow-hidden rounded-panel border border-ig-border bg-ig-surface shadow-lg md:w-72">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {!stream && (
            <div className="absolute inset-0 flex items-center justify-center bg-ig-surface">
              <div className="text-center text-ig-muted">
                <VideoOff size={20} strokeWidth={1.5} className="mx-auto mb-1" />
                <p className="text-[12px]">{t("messenger.cameraOff")}</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 rounded-control bg-ig-ground/80 px-2.5 py-0.5 text-[12px] text-ig-text">
            {t("messenger.you")}
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
          <button
            type="button"
            onClick={toggleAudio}
            aria-label={isAudioEnabled ? "Mute" : "Unmute"}
            title={isAudioEnabled ? "Mute" : "Unmute"}
            className={`ig-press flex h-12 w-12 items-center justify-center rounded-full border border-ig-border text-ig-text ${
              isAudioEnabled ? "bg-ig-raised" : "bg-ig-like"
            }`}
          >
            {isAudioEnabled ? (
              <Mic size={20} strokeWidth={1.5} />
            ) : (
              <MicOff size={20} strokeWidth={1.5} />
            )}
          </button>
          <button
            type="button"
            onClick={onEndCall}
            aria-label={t("messenger.endCall")}
            title={t("messenger.endCall")}
            className="ig-press flex h-12 w-12 items-center justify-center rounded-full bg-ig-like text-ig-text hover:opacity-90"
          >
            <PhoneOff size={20} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={toggleVideo}
            aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            className={`ig-press flex h-12 w-12 items-center justify-center rounded-full border border-ig-border text-ig-text ${
              isVideoEnabled ? "bg-ig-raised" : "bg-ig-like"
            }`}
          >
            {isVideoEnabled ? (
              <Video size={20} strokeWidth={1.5} />
            ) : (
              <VideoOff size={20} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
