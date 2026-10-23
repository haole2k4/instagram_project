import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { X, Image as ImageIcon, Film, Loader2 } from "lucide-react";
import { handleCreatePost } from "../../Service/postApi";
import { createStory } from "../../Service/storyApi";

const CreatePostModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { userInfo } = useSelector((state) => state.login);

  const [activeTab, setActiveTab] = useState("post"); // "post" | "story"
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [isLoading, setIsLoading] = useState(false);

  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setIsVideo(
      selected.type.startsWith("video/") || selected.name.endsWith(".mp4")
    );
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsVideo(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isLoading) return;

    if (activeTab === "story" && !file) {
      toast.warn(t("story.pleaseSelectMedia"));
      return;
    }

    if (activeTab === "post" && !file && !content.trim()) {
      toast.warn(t("CreateNew.tellMeWhatYouThink"));
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === "post") {
        const formData = new FormData();
        formData.append("title", content || "");
        formData.append("access", privacy || "PUBLIC");
        formData.append("status", "True");
        if (userInfo?.id) {
          formData.append("userId", userInfo.id);
        }
        if (file) {
          formData.append("media", file);
        }

        const res = await handleCreatePost(formData);
        if (res && (res.id || res.statusCode === 200 || res.status === 200 || res.data?.id)) {
          toast.success(t("post.createSuccess"));
          resetAndClose();
        } else {
          toast.error(t("post.createError"));
        }
      } else {
        const formData = new FormData();
        if (userInfo?.id) {
          formData.append("userId", userInfo.id);
        }
        formData.append("file", file);
        formData.append("access", privacy);
        formData.append("status", "1");

        const res = await createStory(formData);
        if (res && (res.id || res.statusCode === 200 || res.status === 200 || res.data?.id)) {
          toast.success(t("story.createSuccess"));
          resetAndClose();
        } else {
          toast.error(t("story.createError"));
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(
        activeTab === "post" ? t("post.createError") : t("story.createError")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    handleClearFile();
    setContent("");
    setPrivacy("PUBLIC");
    setActiveTab("post");
    onClose();
  };

  const avatar = userInfo?.avatar || userInfo?.userImage || "/default-avatar.png";
  const nickname = userInfo?.userNickname || userInfo?.nikName || "User";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-none animate-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("CreateNew.createPost")}
        className="flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-panel border border-ig-border bg-ig-surface text-ig-text shadow-2xl"
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-ig-border px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("post")}
              className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition-colors ${
                activeTab === "post"
                  ? "bg-ig-raised text-ig-text"
                  : "text-ig-muted hover:text-ig-text"
              }`}
            >
              {t("CreateNew.postTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("story")}
              className={`rounded-lg px-3 py-1 text-[13px] font-semibold transition-colors ${
                activeTab === "story"
                  ? "bg-ig-raised text-ig-text"
                  : "text-ig-muted hover:text-ig-text"
              }`}
            >
              {t("CreateNew.storyTab")}
            </button>
          </div>

          <p className="text-[14px] font-semibold text-ig-text">
            {activeTab === "post"
              ? t("CreateNew.createPost")
              : t("story.createTitle")}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleSubmit}
              className="text-[14px] font-semibold text-ig-accent hover:opacity-80 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t("CreateNew.create")
              )}
            </button>
            <button
              type="button"
              onClick={resetAndClose}
              className="p-1 text-ig-muted hover:text-ig-text"
              aria-label={t("common.close") || "Close"}
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-[360px] flex-1 grid-cols-1 md:grid-cols-2">
          {/* Media Area */}
          <div className="relative flex flex-col items-center justify-center border-b border-ig-border bg-ig-ground p-4 md:border-b-0 md:border-r">
            {previewUrl ? (
              <div className="relative flex h-full max-h-[380px] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    className="max-h-[380px] w-full object-contain"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[380px] w-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={handleClearFile}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/90"
                  aria-label="Remove media"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex gap-2 text-ig-muted">
                  <ImageIcon size={40} strokeWidth={1.5} />
                  <Film size={40} strokeWidth={1.5} />
                </div>
                <p className="text-[14px] text-ig-text">
                  {t("CreateNew.dropHint")}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-control bg-ig-accent px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 active:scale-[.97]"
                >
                  {t("CreateNew.selectFromComputer")}
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Form / Metadata Area */}
          <div className="flex flex-col justify-between bg-ig-surface p-4">
            <div className="flex flex-col gap-3">
              {/* User row */}
              <div className="flex items-center gap-2.5">
                <img
                  src={avatar}
                  alt={nickname}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <span className="text-[14px] font-semibold text-ig-text">
                  {nickname}
                </span>
              </div>

              {/* Caption (only for Post or optional for Story) */}
              {activeTab === "post" && (
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("CreateNew.tellMeWhatYouThink")}
                  className="w-full resize-none rounded-lg bg-transparent p-1 text-[14px] text-ig-text placeholder-ig-muted focus:outline-none"
                />
              )}

              {/* Privacy option */}
              <div className="mt-2 flex items-center justify-between border-t border-ig-border pt-3">
                <label
                  htmlFor="createModalPrivacy"
                  className="text-[13px] text-ig-muted"
                >
                  {t("CreateNew.privacy")}
                </label>
                <select
                  id="createModalPrivacy"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="rounded-lg border border-ig-border bg-ig-ground px-2.5 py-1 text-[13px] text-ig-text focus:outline-none"
                >
                  <option value="PUBLIC">{t("CreateNew.public")}</option>
                  <option value="ONLY_FRIEND">{t("CreateNew.friends")}</option>
                  <option value="PRIVATE">{t("CreateNew.onlyMe")}</option>
                </select>
              </div>
            </div>

            <p className="mt-4 text-[12px] text-ig-muted">
              {activeTab === "post"
                ? t("post.options")
                : t("story.sectionLabel")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
