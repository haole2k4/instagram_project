import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, Video, X, Users } from "lucide-react";
import { playIncomingRingtone } from "../../Utils/callSounds";

const IncomingCallModal = ({ caller, onAccept, onReject, isGroup = false, hasVideo = true }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const player = playIncomingRingtone();
    return () => {
      player.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("messenger.incomingVideoCall")}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#242424] p-6 text-white shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#1c1c1c]">
            {caller?.userImage ? (
              <img
                src={caller.userImage}
                alt={caller?.userFullname || ""}
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <Users size={32} className="text-white/60" />
            ) : (
              <img
                src="/default-avatar.png"
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 animate-ping rounded-full border border-white/20 opacity-30" />
          </div>

          <h2 className="mb-1 text-[17px] font-semibold text-white">
            {caller?.userFullname || (isGroup ? "Cuộc gọi nhóm" : "Người dùng")}
          </h2>
          <p className="mb-6 text-[13px] text-white/60">
            {isGroup
              ? "Cuộc gọi nhóm đến..."
              : hasVideo
              ? "Cuộc gọi video đến..."
              : "Cuộc gọi thoại đến..."}
          </p>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onReject}
              aria-label={t("messenger.rejectCall")}
              title={t("messenger.rejectCall")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff3040] text-white transition-all hover:bg-[#e02434] active:scale-95"
            >
              <X size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onAccept}
              aria-label={t("messenger.acceptCall")}
              title={t("messenger.acceptCall")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0095f6] text-white transition-all hover:bg-[#1877f2] active:scale-95"
            >
              {hasVideo ? (
                <Video size={20} strokeWidth={2} />
              ) : (
                <Phone size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
