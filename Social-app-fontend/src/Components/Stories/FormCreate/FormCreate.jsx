import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStory } from "../../../Service/storyApi";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import Route from "../../../Components/Routes/index";

const FormCreateStory = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userInfo } = useSelector((state) => state.login);
  const navigate = useNavigate();
  const [t] = useTranslation();

  const privacyOptions = [
    { value: "PUBLIC", label: t("CreateNew.public") },
    { value: "ONLY_FRIEND", label: t("CreateNew.friends") },
    { value: "PRIVATE", label: t("CreateNew.onlyMe") },
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) {
      setFile(null);
      setPreviewUrl(null);
      setFileType("");
      return;
    }

    if (selectedFile.type.startsWith("image/")) {
      setFileType("image");
    } else if (selectedFile.type.startsWith("video/")) {
      setFileType("video");
    } else {
      toast.error(t("story.invalidFileType"));
      setFile(null);
      setPreviewUrl(null);
      setFileType("");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.warn(t("story.pleaseSelectMedia"));
    if (isSubmitting) return;

    const formData = new FormData();
    formData.append("userId", userInfo?.id);
    formData.append("file", file);
    formData.append("access", privacy);
    formData.append("status", "1");

    setIsSubmitting(true);
    try {
      const response = await createStory(formData);
      if (response && (response.id || response.statusCode === 200 || response.status === 200 || response.data?.id)) {
        toast.success(t("story.createSuccess"));
        setFile(null);
        setPreviewUrl(null);
        setPrivacy("PUBLIC");
        navigate(Route.default_session);
      } else {
        toast.error(t("story.createError"));
      }
    } catch (error) {
      console.error("Error creating story:", error);
      toast.error(t("story.createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[470px] rounded-panel border border-ig-border bg-ig-surface p-6 text-ig-text">
      <h1 className="mb-5 text-[20px] font-semibold text-ig-text">
        {t("story.createTitle")}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="storyFileInput"
            className="mb-2 block text-[14px] font-medium text-ig-text"
          >
            {t("CreateNew.media")}
          </label>

          <button
            type="button"
            onClick={() => document.getElementById("storyFileInput").click()}
            className="ig-press inline-flex items-center gap-2 rounded-control border border-ig-raised bg-ig-ground px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-raised"
          >
            <Upload size={16} strokeWidth={1.5} aria-hidden="true" />
            {t("story.selectFile")}
          </button>

          <input
            type="file"
            id="storyFileInput"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {previewUrl && (
          <div className="overflow-hidden rounded-media border border-ig-border bg-ig-ground">
            {fileType === "image" && (
              <img
                src={previewUrl}
                alt={t("CreateNew.media")}
                className="aspect-[9/16] max-h-80 w-full object-contain"
              />
            )}
            {fileType === "video" && (
              <video
                src={previewUrl}
                controls
                className="aspect-[9/16] max-h-80 w-full object-contain"
              />
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="storyPrivacy"
            className="mb-2 block text-[14px] font-medium text-ig-text"
          >
            {t("CreateNew.privacy")}
          </label>
          <select
            id="storyPrivacy"
            className="w-full rounded-xl border border-ig-border bg-ig-ground px-3.5 py-2.5 text-[14px] text-ig-text focus:outline-none focus:ring-2 focus:ring-ig-accent"
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="ig-press w-full rounded-control bg-ig-accent py-2.5 text-[14px] font-semibold text-ig-text hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? t("common.submitting") : t("CreateNew.create")}
        </button>
      </form>
    </div>
  );
};

export default FormCreateStory;
