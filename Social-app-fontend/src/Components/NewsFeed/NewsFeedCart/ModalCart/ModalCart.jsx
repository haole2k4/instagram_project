import React, { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Send,
  Smile,
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
  isLiked = false,
  onToggleLikePost,
}) => {
  const { userInfo } = useSelector((state) => state.login);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [failedMedia, setFailedMedia] = useState({});
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const commentInputRef = useRef(null);

  // Lưu trạng thái tim bình luận theo user
  const [commentLikes, setCommentLikes] = useState(() => {
    try {
      const stored = localStorage.getItem(
        `ig_comment_likes_${userInfo?.id || "guest"}`
      );
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [poppingCommentHeart, setPoppingCommentHeart] = useState(null);

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

  const toggleCommentLike = (commentId) => {
    setPoppingCommentHeart(commentId);
    setTimeout(() => setPoppingCommentHeart(null), 250);

    setCommentLikes((prev) => {
      const updated = {
        ...prev,
        [commentId]: !prev[commentId],
      };
      try {
        localStorage.setItem(
          `ig_comment_likes_${userInfo?.id || "guest"}`,
          JSON.stringify(updated)
        );
      } catch (err) {
        console.error("Failed to save comment likes", err);
      }
      return updated;
    });
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("newFed.comment")}
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel relative flex h-[94vh] max-h-[920px] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-ig-border bg-black shadow-2xl md:flex-row"
      >
        {/* Vùng Media (Ảnh/Video) - Tối ưu tỷ lệ và căn giữa hoàn hảo */}
        <div className="relative flex h-1/2 w-full flex-1 items-center justify-center bg-black md:h-full border-b md:border-b-0 md:border-r border-ig-border overflow-hidden select-none">
          {failedMedia[`${post.id}-${currentImageIndex}-${currentMedia?.url}`] ? (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-ig-muted">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ig-raised text-ig-faint">
                <ImageIcon size={24} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium text-ig-muted">
                {t("post.imageLoadError")}
              </p>
            </div>
          ) : isVideoMedia ? (
            <video
              src={currentMedia?.url}
              className="max-h-full max-w-full object-contain"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={currentMedia?.url || "/default-avatar.png"}
              className="max-h-full max-w-full object-contain"
              alt={t("post.postImage")}
              onError={() =>
                setFailedMedia((prev) => ({
                  ...prev,
                  [`${post.id}-${currentImageIndex}-${currentMedia?.url}`]: true,
                }))
              }
            />
          )}

          {post.media?.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t("story.previous")}
                title={t("story.previous")}
                onClick={prevImage}
                className="ig-press absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={t("story.next")}
                title={t("story.next")}
                onClick={nextImage}
                className="ig-press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
              >
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-0.5 text-[12px] font-medium text-white tabular-nums backdrop-blur-md">
                {currentImageIndex + 1} / {post.media.length}
              </div>
            </>
          )}
        </div>

        {/* Cột Chi Tiết & Bình Luận (Right Side) */}
        <div className="flex h-1/2 w-full shrink-0 flex-col justify-between bg-ig-ground text-ig-text md:h-full md:w-[420px] lg:w-[460px]">
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-ig-rule px-4 py-3 shrink-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="ig-ring-story rounded-full p-[1.5px]">
                <img
                  src={post.user?.userImage || "/default-avatar.png"}
                  className="h-8 w-8 rounded-full bg-ig-surface object-cover"
                  alt={post.user?.userNickname || ""}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white">
                  {post.user?.userNickname || t("story.user")}
                </p>
                <div className="flex items-center gap-1.5 text-[12px] text-neutral-400 tabular-nums">
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
                    className="ig-press flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-ig-surface hover:text-white"
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
                          <p className="mb-2 text-[12px] text-neutral-400">
                            {t("post.confirmDeletePost")}
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="rounded-control px-2.5 py-1 text-[12px] text-neutral-400 hover:text-white"
                            >
                              {t("CreateNew.cancel")}
                            </button>
                            <button
                              type="button"
                              onClick={handleDeletePost}
                              className="ig-press rounded-control bg-ig-like px-2.5 py-1 text-[12px] font-semibold text-white"
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
                className="ig-press flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-ig-surface hover:text-white"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Danh Sách Bình Luận & Caption (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* Post Caption (Hiển thị như mục đầu tiên) */}
            {post.title && (
              <div className="flex items-start gap-3 border-b border-ig-rule pb-3.5">
                <img
                  src={post.user?.userImage || "/default-avatar.png"}
                  className="h-8 w-8 shrink-0 rounded-full bg-ig-surface object-cover mt-0.5"
                  alt={post.user?.userNickname || ""}
                />
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="leading-snug">
                    <span className="mr-2 font-semibold text-white">
                      {post.user?.userNickname}
                    </span>
                    <span className="text-neutral-200">{post.title}</span>
                  </p>
                  <span className="mt-1 block text-[12px] text-neutral-500 tabular-nums">
                    {formatTime(post.createdAt, t)}
                  </span>
                </div>
              </div>
            )}

            {/* Danh sách bình luận */}
            {comments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-semibold text-white">
                  {t("post.noComments") || "Chưa có bình luận nào."}
                </p>
                <p className="mt-1 text-[13px] text-neutral-500">
                  Bắt đầu cuộc trò chuyện.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const hasLikedComment = !!commentLikes[comment.id];
                  return (
                    <div
                      key={comment.id}
                      className="group flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-start gap-3 flex-1">
                        <img
                          src={comment.userImage || "/default-avatar.png"}
                          className="h-8 w-8 shrink-0 rounded-full bg-ig-surface object-cover mt-0.5"
                          alt={comment.userNickname || ""}
                        />
                        <div className="min-w-0 flex-1 text-[14px]">
                          <p className="leading-snug">
                            <span className="mr-2 font-semibold text-white">
                              {comment.userNickname}
                            </span>
                            <span className="text-neutral-200 break-words">
                              {comment.content}
                            </span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-3 text-[12px] text-neutral-500 tabular-nums">
                            <span>{formatTime(comment.createdAt, t)}</span>
                            {hasLikedComment && (
                              <span className="font-semibold text-neutral-300">
                                1 lượt thích
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReplyClick(comment.userNickname)}
                              className="font-medium text-neutral-400 hover:text-white"
                            >
                              {t("post.reply") || "Trả lời"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* NÚT TIM CHO BÌNH LUẬN (Requirement 5) */}
                      <button
                        type="button"
                        aria-label="Thích bình luận"
                        onClick={() => toggleCommentLike(comment.id)}
                        className={`ig-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform ${
                          hasLikedComment
                            ? "text-ig-like"
                            : "text-neutral-500 hover:text-neutral-300"
                        } ${
                          poppingCommentHeart === comment.id
                            ? "ig-heart-pop"
                            : ""
                        }`}
                      >
                        <Heart
                          size={15}
                          strokeWidth={1.5}
                          className={hasLikedComment ? "fill-current" : ""}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Bar (Like post, Comment, Save, Likes count, Time) */}
          <div className="border-t border-ig-rule px-4 py-3 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={t("newFed.like")}
                  onClick={() => {
                    if (onToggleLikePost && post) {
                      onToggleLikePost(post.id, post.likesCount);
                    }
                  }}
                  className={`ig-press flex items-center justify-center ${
                    isLiked ? "text-ig-like" : "text-white hover:text-neutral-400"
                  }`}
                >
                  <Heart
                    size={24}
                    strokeWidth={1.5}
                    className={isLiked ? "fill-current" : ""}
                  />
                </button>
                <button
                  type="button"
                  aria-label={t("newFed.comment")}
                  onClick={() => commentInputRef.current?.focus()}
                  className="ig-press flex items-center justify-center text-white hover:text-neutral-400"
                >
                  <MessageCircle size={24} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  aria-label="Chia sẻ"
                  onClick={() => toast.info("Đã sao chép liên kết bài viết.")}
                  className="ig-press flex items-center justify-center text-white hover:text-neutral-400"
                >
                  <Send size={22} strokeWidth={1.5} />
                </button>
              </div>

              <button
                type="button"
                aria-label={t("post.save")}
                onClick={() => setIsSaved((prev) => !prev)}
                className={`ig-press flex items-center justify-center ${
                  isSaved ? "text-white fill-white" : "text-white hover:text-neutral-400"
                }`}
              >
                <Bookmark
                  size={24}
                  strokeWidth={1.5}
                  className={isSaved ? "fill-current" : ""}
                />
              </button>
            </div>

            <p className="text-[14px] font-semibold text-white tabular-nums">
              {post.likesCount || 0} {t("newFed.like")}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500 mt-1">
              {formatTime(post.createdAt, t)}
            </p>
          </div>

          {/* Ô Thêm Bình Luận */}
          <div className="flex items-center gap-2 border-t border-ig-rule px-4 py-3 shrink-0">
            <button
              type="button"
              className="text-neutral-400 hover:text-white"
              onClick={() => {
                setNewComment((prev) => `${prev} ❤️ `);
                commentInputRef.current?.focus();
              }}
              aria-label="Thêm biểu tượng cảm xúc"
            >
              <Smile size={22} strokeWidth={1.5} />
            </button>
            <input
              ref={commentInputRef}
              type="text"
              aria-label={t("post.commentPlaceholder")}
              placeholder={t("post.commentPlaceholder") || "Thêm bình luận..."}
              className="flex-1 bg-transparent py-1 text-[14px] text-white placeholder-neutral-500 focus:outline-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newComment.trim()) {
                  handleCommentSubmit();
                }
              }}
            />
            <button
              type="button"
              disabled={!newComment.trim()}
              className="ig-press text-[14px] font-semibold text-[#0095f6] hover:text-[#1877f2] disabled:opacity-40"
              onClick={handleCommentSubmit}
            >
              {t("post.postComment") || "Đăng"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCart;
