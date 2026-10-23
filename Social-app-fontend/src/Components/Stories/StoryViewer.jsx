import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Heart,
  Send,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getStories, getStoryByFollowing, deleteStory } from "../../Service/storyApi";
import Route from "../../Components/Routes/index";

const VIEWED_STORIES_KEY = "ig_viewed_stories";

const markStoryViewed = (storyId) => {
  try {
    const raw = localStorage.getItem(VIEWED_STORIES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(storyId)) {
      localStorage.setItem(
        VIEWED_STORIES_KEY,
        JSON.stringify([...list, storyId])
      );
    }
  } catch {
    // ignore storage errors
  }
};

const StoryViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { userInfo } = useSelector((state) => state.login);

  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const videoRef = useRef(null);
  const animationRef = useRef(null);
  const lastTickRef = useRef(null);
  const elapsedRef = useRef(0);
  const durationRef = useRef(10000);

  useEffect(() => {
    let mounted = true;
    const fetchAllStories = async () => {
      setIsLoading(true);
      try {
        const res = userInfo?.id
          ? await getStoryByFollowing(userInfo.id)
          : await getStories();
        const data = Array.isArray(res?.data) ? res.data : [];
        if (data.length === 0) {
          const fallback = await getStories();
          if (mounted) {
            setStories(Array.isArray(fallback?.data) ? fallback.data : []);
          }
        } else if (mounted) {
          setStories(data);
        }
      } catch (error) {
        console.error("Error fetching stories:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchAllStories();
    return () => {
      mounted = false;
    };
  }, [userInfo?.id]);

  const parsedId = parseInt(id, 10);
  const currentStory =
    stories.find((story) => story.id === parsedId) ||
    stories[currentStoryIndex];

  const isVideo =
    currentStory?.url?.endsWith(".mp4") || currentStory?.url?.endsWith(".mp3");

  useEffect(() => {
    if (stories.length > 0) {
      const index = stories.findIndex((story) => story.id === parsedId);
      setCurrentStoryIndex(index >= 0 ? index : 0);
    }
  }, [stories, parsedId]);

  useEffect(() => {
    if (currentStory?.id) {
      markStoryViewed(currentStory.id);
      elapsedRef.current = 0;
      setProgress(0);
      setIsPaused(false);
    }
  }, [currentStory?.id]);

  const handleClose = useCallback(() => {
    navigate(Route.default_session);
  }, [navigate]);

  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      const prevStory = stories[currentStoryIndex - 1];
      navigate(`${Route.story}/${prevStory.id}`);
    }
  }, [currentStoryIndex, stories, navigate]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      const nextStory = stories[currentStoryIndex + 1];
      navigate(`${Route.story}/${nextStory.id}`);
    } else {
      navigate(Route.default_session);
    }
  }, [currentStoryIndex, stories, navigate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (showOptions) {
          setShowOptions(false);
        } else {
          handleClose();
        }
      } else if (event.key === "ArrowLeft" && !showDeleteConfirm) {
        handlePrevious();
      } else if (event.key === "ArrowRight" && !showDeleteConfirm) {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handlePrevious, handleNext, showDeleteConfirm, showOptions]);

  useEffect(() => {
    if (!currentStory || isPaused || showDeleteConfirm) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTickRef.current = null;
      return;
    }

    let isCancelled = false;

    const tick = (now) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      elapsedRef.current += delta;

      const ratio = Math.min(elapsedRef.current / durationRef.current, 1);
      setProgress(ratio * 100);

      if (ratio >= 1) {
        if (!isCancelled) {
          handleNext();
        }
      } else {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      isCancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      lastTickRef.current = null;
    };
  }, [currentStory, isPaused, showDeleteConfirm, handleNext]);

  const togglePause = (e) => {
    e.stopPropagation();
    setIsPaused((prev) => {
      const next = !prev;
      if (videoRef.current) {
        if (next) videoRef.current.pause();
        else videoRef.current.play().catch(() => {});
      }
      return next;
    });
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  const timeAgo = (timestamp) => {
    if (!timestamp) return t("story.justNow");
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now - created;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffHour >= 1) return t("story.hoursAgo", { count: diffHour });
    if (diffMin >= 1) return t("story.minutesAgo", { count: diffMin });
    return t("story.justNow");
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      toast.success(t("story.replySent"));
      setMessage("");
    }
  };

  const handleLike = () => {
    setIsLiked((prev) => {
      const next = !prev;
      if (next) {
        setHeartPop(true);
        setTimeout(() => setHeartPop(false), 220);
      }
      return next;
    });
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await deleteStory(currentStory.id);
      toast.success(t("story.deleteSuccess"));
      const updatedStories = stories.filter(
        (story) => story.id !== currentStory.id
      );
      setStories(updatedStories);
      setShowDeleteConfirm(false);
      setShowOptions(false);

      if (updatedStories.length === 0) {
        navigate(Route.default_session);
      } else {
        const nextIndex =
          currentStoryIndex >= updatedStories.length
            ? currentStoryIndex - 1
            : currentStoryIndex;
        const nextStory = updatedStories[nextIndex];
        navigate(`${Route.story}/${nextStory.id}`);
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error(t("story.deleteError"));
    }
  };

  if (isLoading || !currentStory) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground p-4">
        <div
          role="status"
          aria-busy="true"
          className="aspect-[9/16] w-full max-w-[400px] rounded-media border border-ig-border bg-ig-surface"
        />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("story.viewerTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground"
    >
      <h1 className="sr-only">{t("story.viewerTitle")}</h1>

      {/* Nút đóng góc trên phải màn hình */}
      <button
        type="button"
        onClick={handleClose}
        aria-label={t("story.close")}
        title={t("story.close")}
        className="ig-press absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-ig-surface text-ig-text hover:bg-ig-raised"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      <div className="relative flex h-full w-full items-center justify-center">
        {/* Khung Story */}
        <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-media border border-ig-border bg-ig-ground md:h-[90dvh]">
          {/* Thanh tiến trình dùng transform: scaleX */}
          <div className="absolute left-3 right-3 top-3 z-20 flex gap-1.5">
            <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ig-raised">
              <div
                className="h-full w-full bg-ig-text"
                style={{
                  transform: `scaleX(${Math.min(
                    Math.max(progress / 100, 0),
                    1
                  )})`,
                  transformOrigin: "left",
                }}
              />
            </div>
          </div>

          {/* Header 64px */}
          <div className="absolute left-3 right-3 top-5 z-20 flex h-14 items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src={currentStory.user?.userImage || "/default-avatar.png"}
                alt={currentStory.user?.userNickname || ""}
                className="h-9 w-9 shrink-0 rounded-full bg-ig-surface object-cover"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold text-ig-text">
                    {currentStory.user?.userNickname || t("story.user")}
                  </span>
                  <span className="shrink-0 text-[12px] text-ig-muted tabular-nums">
                    • {timeAgo(currentStory.createdAt)}
                  </span>
                </div>
                {currentStory.music && (
                  <p className="truncate text-[12px] text-ig-muted">
                    <span className="font-medium text-ig-text">
                      {currentStory.music.artist}
                    </span>{" "}
                    — {currentStory.music.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isVideo && (
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? t("story.unmute") : t("story.mute")}
                  title={isMuted ? t("story.unmute") : t("story.mute")}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-full text-ig-text hover:bg-ig-surface/60"
                >
                  {isMuted ? (
                    <VolumeX size={18} strokeWidth={1.5} />
                  ) : (
                    <Volume2 size={18} strokeWidth={1.5} />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={togglePause}
                aria-label={isPaused ? t("story.play") : t("story.pause")}
                title={isPaused ? t("story.play") : t("story.pause")}
                className="ig-press flex h-9 w-9 items-center justify-center rounded-full text-ig-text hover:bg-ig-surface/60"
              >
                {isPaused ? (
                  <Play size={18} strokeWidth={1.5} />
                ) : (
                  <Pause size={18} strokeWidth={1.5} />
                )}
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label={t("story.options")}
                  title={t("story.options")}
                  aria-expanded={showOptions}
                  className="ig-press flex h-9 w-9 items-center justify-center rounded-full text-ig-text hover:bg-ig-surface/60"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions((prev) => !prev);
                  }}
                >
                  <MoreHorizontal size={18} strokeWidth={1.5} />
                </button>

                {showOptions && (
                  <div className="ig-modal-panel absolute right-0 mt-2 w-44 rounded-panel border border-ig-border bg-ig-raised p-1.5 shadow-lg z-30">
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ig-like hover:bg-ig-surface"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                    >
                      {t("story.deleteStory")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Media Story */}
          <div className="flex flex-1 items-center justify-center bg-ig-ground">
            {isVideo ? (
              <video
                ref={videoRef}
                src={currentStory.url}
                onLoadedMetadata={() => {
                  if (videoRef.current?.duration) {
                    durationRef.current = videoRef.current.duration * 1000;
                  }
                }}
                className="max-h-full w-full object-contain"
                autoPlay
                playsInline
                muted={isMuted}
              />
            ) : (
              <img
                src={currentStory.url}
                alt={currentStory.user?.userNickname || t("story.viewerTitle")}
                className="max-h-full w-full object-contain"
              />
            )}
          </div>

          {/* Khu vực trả lời và thích */}
          <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2.5">
            <div className="flex-1">
              <input
                type="text"
                value={message}
                aria-label={t("story.replyPlaceholder")}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={t("story.replyPlaceholder")}
                className="w-full rounded-control border border-ig-raised bg-ig-surface/90 px-4 py-2 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleLike}
              aria-label={t("newFed.like")}
              title={t("newFed.like")}
              className={`ig-press flex h-10 w-10 items-center justify-center rounded-full ${
                isLiked ? "text-ig-like" : "text-ig-text"
              } ${heartPop ? "ig-heart-pop" : ""}`}
            >
              <Heart
                size={24}
                strokeWidth={1.5}
                className={isLiked ? "fill-current" : ""}
              />
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              aria-label={t("story.sendReply")}
              title={t("story.sendReply")}
              className="ig-press flex h-10 w-10 items-center justify-center rounded-full text-ig-text"
            >
              <Send size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Nút Previous */}
        {currentStoryIndex > 0 && (
          <button
            type="button"
            aria-label={t("story.previous")}
            title={t("story.previous")}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            className="ig-press absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-raised text-ig-text md:left-[calc(50%-256px)]"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
        )}

        {/* Nút Next */}
        <button
          type="button"
          aria-label={t("story.next")}
          title={t("story.next")}
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="ig-press absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-raised text-ig-text md:right-[calc(50%-256px)]"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>

        {/* Modal xác nhận xóa */}
        {showDeleteConfirm && (
          <div
            onClick={() => setShowDeleteConfirm(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground/80 p-4"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-story-title"
              onClick={(e) => e.stopPropagation()}
              className="ig-modal-panel w-full max-w-sm rounded-panel border border-ig-border bg-ig-raised p-6 shadow-lg"
            >
              <h2
                id="delete-story-title"
                className="mb-2 text-[16px] font-semibold text-ig-text"
              >
                {t("story.confirmDeleteTitle")}
              </h2>
              <p className="mb-6 text-[14px] text-ig-muted">
                {t("story.confirmDeleteDesc")}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="ig-press rounded-control border border-ig-border bg-ig-surface px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-ground"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  {t("CreateNew.cancel")}
                </button>
                <button
                  type="button"
                  className="ig-press rounded-control bg-ig-like px-4 py-2 text-[14px] font-semibold text-ig-text hover:opacity-90"
                  onClick={handleDeleteStory}
                >
                  {t("story.confirmDeleteBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
