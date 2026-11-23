import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, Video, X, Users } from "lucide-react";
import { playIncomingRingtone } from "../../Utils/callSounds";

const handleAvatarError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = "/default-avatar.png";
};

const IncomingCallModal = ({
  caller,
  onAccept,
  onReject,
  isGroup = false,
  hasVideo = true,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const player = playIncomingRingtone();
    return () => {
      player.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("messenger.incomingVideoCall")}
        className="ig-modal-panel w-full max-w-sm rounded-panel border border-ig-border bg-ig-raised p-6 text-ig-text shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-ig-border bg-ig-surface">
            {caller?.userImage ? (
              <img
                src={caller.userImage}
                alt={caller?.userFullname || ""}
                onError={handleAvatarError}
                className="h-full w-full object-cover"
              />
            ) : isGroup ? (
              <Users size={32} className="text-ig-muted" />
            ) : (
              <img
                src="/default-avatar.png"
                alt="Avatar"
                onError={handleAvatarError}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <h2 className="mb-1 text-[16px] font-semibold text-ig-text">
            {caller?.userFullname || (isGroup ? "Cuộc gọi nhóm" : "Người dùng")}
          </h2>
          <p className="mb-6 text-[13px] text-ig-muted">
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
              className="ig-press flex h-12 w-12 items-center justify-center rounded-full bg-ig-like text-ig-text hover:opacity-90"
            >
              <X size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onAccept}
              aria-label={t("messenger.acceptCall")}
              title={t("messenger.acceptCall")}
              className="ig-press flex h-12 w-12 items-center justify-center rounded-full bg-ig-accent text-ig-text hover:opacity-90"
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
