import React from "react";
import { useTranslation } from "react-i18next";
import { Video, X } from "lucide-react";

const IncomingCallModal = ({ caller, onAccept, onReject }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground/80 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("messenger.incomingVideoCall")}
        className="ig-modal-panel w-full max-w-sm rounded-panel border border-ig-border bg-ig-raised p-6 text-ig-text shadow-lg"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-full border border-ig-border bg-ig-surface">
            <img
              src={caller?.userImage || "/default-avatar.png"}
              alt={caller?.userFullname || ""}
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mb-1 text-[16px] font-semibold text-ig-text">
            {caller?.userFullname}
          </h2>
          <p className="mb-6 text-[14px] text-ig-muted">
            {t("messenger.incomingVideoCall")}
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onAccept}
              aria-label={t("messenger.acceptCall")}
              title={t("messenger.acceptCall")}
              className="ig-press flex h-12 w-12 items-center justify-center rounded-full bg-ig-accent text-ig-text hover:opacity-90"
            >
              <Video size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onReject}
              aria-label={t("messenger.rejectCall")}
              title={t("messenger.rejectCall")}
              className="ig-press flex h-12 w-12 items-center justify-center rounded-full bg-ig-like text-ig-text hover:opacity-90"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
