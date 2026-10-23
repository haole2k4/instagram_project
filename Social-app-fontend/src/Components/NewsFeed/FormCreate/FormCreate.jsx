import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleCreatePost } from "../../../Service/postApi";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import Route from "../../../Components/Routes/index";

const FormNewsFeed = () => {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [isLoading, setIsLoading] = useState(false);
  const { userInfo } = useSelector((state) => state.login);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const privacyOptions = [
    { value: "PUBLIC", label: t("CreateNew.public") },
    { value: "ONLY_FRIEND", label: t("CreateNew.friends") },
    { value: "PRIVATE", label: t("CreateNew.onlyMe") },
  ];

  useEffect(() => {
    return () => {
      if (previewMedia) {
        URL.revokeObjectURL(previewMedia);
      }
    };
  }, [previewMedia]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    setMedia(file);

    if (file) {
      const mediaUrl = URL.createObjectURL(file);
      setPreviewMedia(mediaUrl);
      setIsVideo(file.type.startsWith("video/") || file.name.endsWith(".mp4"));
    } else {
      setPreviewMedia(null);
      setIsVideo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", content || "");
      formData.append("access", privacy || "PUBLIC");
      formData.append("status", "True");
      if (userInfo?.id) {
        formData.append("userId", userInfo.id);
      }
      if (media) {
        formData.append("media", media);
      }

      const response = await handleCreatePost(formData);
      if (response && (response.id || response.statusCode === 200 || response.status === 200 || response.data?.id)) {
        toast.success(t("post.createSuccess"));
        setContent("");
        setMedia(null);
        setPreviewMedia(null);
        setIsVideo(false);
        setPrivacy("PUBLIC");
        navigate(Route.default_session);
      } else {
        toast.error(t("post.createError"));
      }
    } catch (error) {
      toast.error(t("post.createError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[470px] rounded-panel border border-ig-border bg-ig-surface p-6 text-ig-text">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-ig-text">
          {t("CreateNew.createNewsfeed")}
        </h1>
        <select
          id="postPrivacy"
          aria-label={t("CreateNew.privacy")}
          className="rounded-xl border border-ig-border bg-ig-ground px-3 py-1.5 text-[14px] text-ig-text focus:outline-none focus:ring-2 focus:ring-ig-accent"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
        >
          {privacyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="postCaption" className="sr-only">
            {t("CreateNew.caption")}
          </label>
          <textarea
            id="postCaption"
            className="h-32 w-full rounded-xl border border-ig-border bg-ig-ground px-4 py-3 text-[14px] text-ig-text placeholder-ig-faint focus:outline-none focus:ring-2 focus:ring-ig-accent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("CreateNew.caption")}
            required
          />
        </div>

        <div>
          <button
            type="button"
            className="ig-press inline-flex items-center gap-2 rounded-control border border-ig-raised bg-ig-ground px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-raised"
            onClick={() => document.getElementById("postFileInput").click()}
          >
            <Upload size={16} strokeWidth={1.5} aria-hidden="true" />
            {t("CreateNew.selectMedia")}
          </button>
          <input
            id="postFileInput"
            type="file"
            className="hidden"
            accept="image/*,video/mp4"
            onChange={handleMediaChange}
          />
        </div>

        {previewMedia && (
          <div className="overflow-hidden rounded-media border border-ig-border bg-ig-ground">
            {isVideo ? (
              <video
                src={previewMedia}
                className="aspect-[4/5] max-h-80 w-full object-contain"
                controls
                muted
              />
            ) : (
              <img
                src={previewMedia}
                alt={t("CreateNew.media")}
                className="aspect-[4/5] max-h-80 w-full object-cover"
              />
            )}
          </div>
        )}

        <button
          type="submit"
          className="ig-press w-full rounded-control bg-ig-accent py-2.5 text-center text-[14px] font-semibold text-ig-text hover:opacity-90 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? t("CreateNew.loading") : t("CreateNew.create")}
        </button>
      </form>
    </div>
  );
};

export default FormNewsFeed;
