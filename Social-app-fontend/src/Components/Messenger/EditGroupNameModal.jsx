import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const EditGroupNameModal = ({ isOpen, onClose, currentName, onSave }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(currentName || "");

  useEffect(() => {
    setName(currentName || "");
  }, [currentName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (name.trim()) onSave(name.trim());
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground/80 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("messenger.editGroupName")}
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel w-full max-w-md rounded-panel border border-ig-border bg-ig-raised p-6 text-ig-text shadow-lg"
      >
        <h2 className="mb-4 text-[16px] font-semibold text-ig-text">
          {t("messenger.editGroupName")}
        </h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-4 w-full rounded-xl border border-ig-border bg-ig-surface px-3.5 py-2 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
          placeholder={t("messenger.enterGroupName")}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ig-press rounded-control border border-ig-border bg-ig-surface px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-ground"
          >
            {t("messenger.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ig-press rounded-control bg-ig-accent px-4 py-2 text-[14px] font-semibold text-ig-text hover:opacity-90 disabled:opacity-40"
            disabled={!name.trim()}
          >
            {t("messenger.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditGroupNameModal;
