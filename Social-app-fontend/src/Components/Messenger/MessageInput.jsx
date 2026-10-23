import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Smile } from "lucide-react";
import Picker from "emoji-picker-react";

const MessageInput = ({
  value,
  onChange,
  onSend,
  inputRef,
  isBlocked,
  onFocus,
}) => {
  const { t } = useTranslation();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isBlocked) {
      e.preventDefault();
      onSend();
    }
  };

  const handleEmojiClick = (emojiData) => {
    if (emojiData && emojiData.emoji) {
      onChange({ target: { value: value + emojiData.emoji } });
    }
  };

  const handleSendHeart = () => {
    onSend("♥");
  };

  return (
    <div className="border-t border-ig-border bg-ig-ground p-3">
      {isBlocked ? (
        <div className="rounded-panel border border-ig-border bg-ig-surface p-3 text-center text-[14px] text-ig-muted">
          {t("messenger.blockedMessage")}
        </div>
      ) : (
        <div className="relative flex items-center rounded-control border border-ig-border bg-ig-surface px-2 py-1">
          <button
            type="button"
            aria-label="Emoji"
            title="Emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="ig-press flex h-9 w-9 items-center justify-center rounded-full text-ig-muted hover:text-ig-text"
          >
            <Smile size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
          {showEmojiPicker && (
            <div className="ig-modal-panel absolute bottom-14 left-0 z-20 overflow-hidden rounded-panel border border-ig-border bg-ig-raised shadow-lg">
              <Picker onEmojiClick={handleEmojiClick} theme="dark" />
            </div>
          )}

          <textarea
            ref={inputRef}
            value={value}
            aria-label={t("messenger.typeMessage")}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={t("messenger.typeMessage")}
            className="max-h-10 h-9 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-[14px] text-ig-text placeholder-ig-faint focus:outline-none"
            rows={1}
            onFocus={onFocus}
          />

          {value.trim() ? (
            <button
              type="button"
              onClick={() => onSend()}
              className="ig-press rounded-control px-3.5 py-1.5 text-[14px] font-semibold text-ig-accent hover:opacity-85"
            >
              {t("messenger.send")}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t("newFed.like")}
              title={t("newFed.like")}
              onClick={handleSendHeart}
              className="ig-press flex h-9 w-9 items-center justify-center rounded-full text-ig-muted hover:text-ig-like"
            >
              <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
