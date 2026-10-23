import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Lock,
  MoreHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  getCommentsByPostId,
  addComment,
} from "../../../../Service/commentApi";
import { useDispatch, useSelector } from "react-redux";
import notificationSocket from "../../../../Service/NotificationSocket";
import { useTranslation } from "react-i18next";
import { handleUpdateStatus } from "../../../../Service/postApi";
import { toast } from "react-toastify";
import { formatTime } from "../../../../Utils";

const AccessIcon = ({ access, t }) => {
  if (access === "PUBLIC") {
    return (
      <span
        title={t("newFed.public")}
        aria-label={t("newFed.public")}
        className="inline-flex items-center text-ig-faint"
      >
        <Globe size={13} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  if (access === "FRIENDS" || access === "ONLY_FRIEND") {
    return (
      <span
        title={t("CreateNew.friends")}
        aria-label={t("CreateNew.friends")}
        className="inline-flex items-center text-ig-faint"
      >
        <Users size={13} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  if (access === "PRIVATE") {
    return (
      <span
        title={t("newFed.private")}
        aria-label={t("newFed.private")}
        className="inline-flex items-center text-ig-faint"
      >
        <Lock size={13} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  return null;
};

const ModalCart = ({
  isOpen,
  setIsOpen,
  post,
  onCommentAdded,
  fetchPostData,
}) => {
  const { userInfo } = useSelector((state) => state.login);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const commentInputRef = useRef(null);

  useEffect(() => {
    setCurrentImageIndex(0);
    setShowMenu(false);
    setConfirmDelete(false);
  }, [post?.id, isOpen]);

  useEffect(() => {
    if (!isOpen || !post?.id || !userInfo?.id) return;
    const fetchComments = async () => {
      try {
        const response = await getCommentsByPostId(post.id);
        setComments(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    fetchComments();
  }, [isOpen, post?.id, userInfo?.id]);

  useEffect(() => {
    if (!post?.id) return;
    const unsubscribeComments = notificationSocket.subscribeToCommentUpdates(
      (comment) => {
        if (comment.postId === post.id) {
          setComments((prev) => {
            if (prev.some((c) => c.id === comment.id)) return prev;
            return [comment, ...prev];
          });
          if (comment.commentsCount != null && onCommentAdded) {
            onCommentAdded(post.id, comment.commentsCount);
          }
        }
      }
    );
    return () => {
      unsubscribeComments();
    };
  }, [userInfo?.id, dispatch, post?.id, onCommentAdded]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (confirmDelete) setConfirmDelete(false);
        else if (showMenu) setShowMenu(false);
        else setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen, confirmDelete, showMenu]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !post?.id) return;
    try {
      await addComment(post.id, userInfo.id, newComment.trim());
      const response = await getCommentsByPostId(post.id);
      const list = Array.isArray(response?.data) ? response.data : [];
      setComments(list);
      if (onCommentAdded && list.length > 0) {
        onCommentAdded(post.id, list[0].commentsCount ?? list.length);
      }
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error(t("post.commentError"));
    }
  };

  const nextImage = () => {
    if (!post?.media?.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % post.media.length);
  };

  const prevImage = () => {
    if (!post?.media?.length) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? post.media.length - 1 : prev - 1
    );
  };

  const handleReplyClick = (nickname) => {
    const prefix = `@${nickname} `;
    setNewComment((prev) => (prev.startsWith(prefix) ? prev : `${prefix}${prev}`));
    commentInputRef.current?.focus();
  };

  const handleDeletePost = async () => {
    if (!post?.id) return;
    try {
      const response = await handleUpdateStatus({
        id: post.id,
        status: "False",
      });
      if (response && response.statusCode === 200) {
        if (fetchPostData) fetchPostData();
        setIsOpen(false);
        toast.success(t("post.deleteSuccess"));
      }
    } catch (error) {
      console.error("Delete post error:", error);
      toast.error(t("post.deleteError"));
    }
  };

  if (!isOpen || !post) return null;

  const currentMedia = post.media?.[currentImageIndex];
  const isVideoMedia =
    currentMedia?.type === "VIDEO" || currentMedia?.url?.endsWith(".mp4");

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground/85 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("newFed.comment")}
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel relative flex h-[85dvh] w-full max-w-5xl flex-col overflow-hidden rounded-panel border border-ig-border bg-ig-ground shadow-lg md:flex-row"
      >
        {/* Vùng ảnh/video */}
        <div className="relative flex h-1/2 w-full items-center justify-center bg-ig-ground md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-ig-border">
          {isVideoMedia ? (
            <video
              src={currentMedia?.url}
              className="h-full w-full object-contain"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={currentMedia?.url || "/default-avatar.png"}
              className="h-full w-full object-contain"
              alt={post.title || ""}
            />
          )}
          {post.media?.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t("story.previous")}
                title={t("story.previous")}
                onClick={prevImage}
                className="ig-press absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-ground/80 text-ig-text hover:bg-ig-raised"
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={t("story.next")}
                title={t("story.next")}
                onClick={nextImage}
                className="ig-press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-ground/80 text-ig-text hover:bg-ig-raised"
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-control border border-ig-border bg-ig-ground/80 px-2.5 py-0.5 text-[12px] text-ig-text tabular-nums">
                {currentImageIndex + 1} / {post.media.length}
              </div>
            </>
          )}
        </div>

        {/* Vùng bình luận */}
        <div className="flex h-1/2 w-full flex-col justify-between bg-ig-ground text-ig-text md:h-full md:w-1/2">
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-ig-rule px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={post.user?.userImage || "/default-avatar.png"}
                className="h-9 w-9 shrink-0 rounded-full bg-ig-surface object-cover"
                alt={post.user?.userNickname || ""}
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ig-text">
                  {post.user?.userNickname || t("story.user")}
                </p>
                <div className="flex items-center gap-1.5 text-[12px] text-ig-faint tabular-nums">
                  <span>{formatTime(post.createdAt, t)}</span>
                  <AccessIcon access={post?.access} t={t} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {userInfo?.id === post.user?.id && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t("story.options")}
                    title={t("story.options")}
                    aria-expanded={showMenu}
                    onClick={() => setShowMenu((prev) => !prev)}
                    className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
                  >
                    <MoreHorizontal size={18} strokeWidth={1.5} />
                  </button>
                  {showMenu && (
                    <div className="ig-modal-panel absolute right-0 top-10 z-50 w-44 rounded-panel border border-ig-border bg-ig-raised p-1.5 shadow-lg">
                      {!confirmDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ig-like hover:bg-ig-surface"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                          {t("post.deletePost")}
                        </button>
                      ) : (
                        <div className="p-2">
                          <p className="mb-2 text-[12px] text-ig-muted">
                            {t("post.confirmDeletePost")}
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="rounded-control px-2.5 py-1 text-[12px] text-ig-muted hover:text-ig-text"
                            >
                              {t("CreateNew.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={handleDeletePost}
                              className="ig-press rounded-control bg-ig-like px-2.5 py-1 text-[12px] font-semibold text-ig-text"
                            >
                              {t("story.confirmDeleteBtn")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                aria-label={t("story.close")}
                title={t("story.close")}
                onClick={() => setIsOpen(false)}
                className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Danh sách bình luận */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {post.title && (
              <div className="mb-4 flex items-start gap-3 border-b border-ig-rule pb-3">
                <img
                  src={post.user?.userImage || "/default-avatar.png"}
                  className="h-8 w-8 shrink-0 rounded-full bg-ig-surface object-cover"
                  alt={post.user?.userNickname || ""}
                />
                <div className="min-w-0 flex-1 text-[14px]">
                  <span className="mr-2 font-semibold text-ig-text">
                    {post.user?.userNickname}
                  </span>
                  <span className="text-ig-text">{post.title}</span>
                </div>
              </div>
            )}

            {comments.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-ig-muted">
                {t("post.noComments")}
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <img
                      src={comment.userImage || "/default-avatar.png"}
                      className="h-8 w-8 shrink-0 rounded-full bg-ig-surface object-cover"
                      alt={comment.userNickname || ""}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] leading-snug">
                        <span className="mr-2 font-semibold text-ig-text">
                          {comment.userNickname}
                        </span>
                        <span className="text-ig-text">{comment.content}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[12px] text-ig-faint tabular-nums">
                        <span>{formatTime(comment.createdAt, t)}</span>
                        <button
                          type="button"
                          onClick={() => handleReplyClick(comment.userNickname)}
                          className="font-medium text-ig-muted hover:text-ig-text"
                        >
                          {t("post.reply")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ô thêm bình luận */}
          <div className="flex items-center gap-2 border-t border-ig-rule px-4 py-3">
            <input
              ref={commentInputRef}
              type="text"
              aria-label={t("post.commentPlaceholder")}
              placeholder={t("post.commentPlaceholder")}
              className="flex-1 bg-transparent py-1.5 text-[14px] text-ig-text placeholder-ig-faint focus:outline-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommentSubmit();
              }}
            />
            <button
              type="button"
              disabled={!newComment.trim()}
              className="ig-press text-[14px] font-semibold text-ig-accent hover:opacity-85 disabled:opacity-40"
              onClick={handleCommentSubmit}
            >
              {t("post.postComment")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCart;
