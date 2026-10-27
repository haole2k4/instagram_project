import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe,
  Heart,
  Image as ImageIcon,
  Lock,
  MessageCircle,
  Users,
} from "lucide-react";

import ModalCart from "./ModalCart/ModalCart";
import {
  handleLike,
  unlikePost,
  getPostByFollowing,
  getLikedPostIdsByUser,
} from "../../../Service/postApi";
import { formatTime, cleanMojibake } from "../../../Utils";
import notificationSocket from "../../../Service/NotificationSocket";
import Route from "../../../Components/Routes/index";
import { PostCardSkeleton } from "../../Common/FlatSkeleton";
import EmptyState from "../../Common/EmptyState";

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

const NewsFeedCart = () => {
  const [likes, setLikes] = useState({});
  const [poppingHearts, setPoppingHearts] = useState({});
  const [doubleTapHeart, setDoubleTapHeart] = useState({});
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [failedMedia, setFailedMedia] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [postData, setPostData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const { userInfo } = useSelector((state) => state.login);
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchLikedPosts = useCallback(
    async (userId) => {
      try {
        const response = await getLikedPostIdsByUser(userId);
        return Array.isArray(response?.data) ? response.data : [];
      } catch (error) {
        console.error("Error fetching liked posts:", error);
        return [];
      }
    },
    []
  );

  const fetchPostData = useCallback(async () => {
    if (!userInfo?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const postsResponse = await getPostByFollowing(userInfo.id);
      const rawPosts = Array.isArray(postsResponse?.data)
        ? postsResponse.data
        : [];
      const filteredPosts = [...rawPosts].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setPostData(filteredPosts);

      const initialIndexes = {};
      filteredPosts.forEach((post) => {
        initialIndexes[post.id] = 0;
      });
      setCurrentImageIndex(initialIndexes);

      const likedPostIds = await fetchLikedPosts(userInfo.id);
      const initialLikes = {};
      filteredPosts.forEach((post) => {
        initialLikes[post.id] = likedPostIds.includes(post.id);
      });
      setLikes(initialLikes);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error(t("post.fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, fetchLikedPosts, t]);

  useEffect(() => {
    fetchPostData();
  }, [fetchPostData]);

  useEffect(() => {
    let unsubscribeLikes;
    if (userInfo?.id) {
      unsubscribeLikes = notificationSocket.subscribeToLikeUpdates((data) => {
        setPostData((prev) =>
          prev.map((post) =>
            post.id === data.postId
              ? { ...post, likesCount: data.likesCount }
              : post
          )
        );
      });
    }

    return () => {
      if (unsubscribeLikes) {
        unsubscribeLikes();
      }
    };
  }, [userInfo?.id, dispatch]);

  useEffect(() => {
    const unsubscribeComments = notificationSocket.subscribeToCommentUpdates(
      (comment) => {
        if (comment.commentsCount != null) {
          setPostData((prev) =>
            prev.map((post) =>
              post.id === comment.postId
                ? { ...post, commentsCount: comment.commentsCount }
                : post
            )
          );
        }
      }
    );
    return () => {
      unsubscribeComments();
    };
  }, [userInfo?.id, dispatch]);

  const triggerHeartPop = (postId) => {
    setPoppingHearts((prev) => ({ ...prev, [postId]: true }));
    setTimeout(() => {
      setPoppingHearts((prev) => ({ ...prev, [postId]: false }));
    }, 220);
  };

  const handleLikePost = async (id, likesCount) => {
    const isCurrentlyLiked = !!likes[id];
    const originalCount = likesCount ?? 0;

    if (isCurrentlyLiked) {
      // Unlike post
      setLikes((prevLikes) => ({
        ...prevLikes,
        [id]: false,
      }));
      const newCount = Math.max(0, originalCount - 1);
      setPostData((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likesCount: newCount } : post
        )
      );
      try {
        await unlikePost(id, userInfo.id);
      } catch (error) {
        console.error("Error unliking post:", error);
        setLikes((prevLikes) => ({
          ...prevLikes,
          [id]: true,
        }));
        setPostData((prev) =>
          prev.map((post) =>
            post.id === id ? { ...post, likesCount: originalCount } : post
          )
        );
        toast.error(t("post.likeError") || "Không thể hủy thích bài viết");
      }
    } else {
      // Like post
      triggerHeartPop(id);
      setLikes((prevLikes) => ({
        ...prevLikes,
        [id]: true,
      }));
      const newLikesCount = originalCount + 1;
      setPostData((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likesCount: newLikesCount } : post
        )
      );
      try {
        await handleLike(id, userInfo.id);
      } catch (error) {
        console.error("Error liking post:", error);
        if (!error.response?.data?.message?.includes("đã thích")) {
          setLikes((prevLikes) => ({
            ...prevLikes,
            [id]: false,
          }));
          setPostData((prev) =>
            prev.map((post) =>
              post.id === id ? { ...post, likesCount: originalCount } : post
            )
          );
          toast.error(t("post.likeError"));
        }
      }
    }
  };

  const handleDoubleTapMedia = (post) => {
    setDoubleTapHeart((prev) => ({ ...prev, [post.id]: true }));
    setTimeout(() => {
      setDoubleTapHeart((prev) => ({ ...prev, [post.id]: false }));
    }, 400);

    if (!likes[post.id]) {
      handleLikePost(post.id, post.likesCount);
    }
  };

  const handleModelComment = (post) => {
    setSelectedPost(post);
    setIsOpen(true);
  };

  const nextImage = (postId, totalImages) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [postId]: ((prev[postId] || 0) + 1) % totalImages,
    }));
  };

  const prevImage = (postId, totalImages) => {
    setCurrentImageIndex((prev) => ({
      ...prev,
      [postId]: ((prev[postId] || 0) - 1 + totalImages) % totalImages,
    }));
  };

  const handleCommentAdded = (postId, commentsCount) => {
    setPostData((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, commentsCount } : post
      )
    );
  };

  const handleMediaError = (mediaKey) => {
    setFailedMedia((prev) => ({ ...prev, [mediaKey]: true }));
  };

  if (isLoading) {
    return (
      <div className="flex w-full flex-col py-2">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    );
  }

  if (postData.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title={t("post.emptyFeedTitle")}
        description={t("post.emptyFeedDesc")}
        actionLabel={t("CreateNew.createNewsfeed")}
        onAction={() => navigate(Route.create_newsfeed)}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 py-2 text-ig-text">
      {postData.map((item) => {
        const activeIdx = currentImageIndex[item.id] || 0;
        const currentMedia = item.media?.[activeIdx];
        const currentMediaKey = `${item.id}-${activeIdx}-${currentMedia?.url || ""}`;
        const isMediaFailed = Boolean(failedMedia[currentMediaKey]);
        const isVideoMedia = currentMedia?.url?.endsWith(".mp4");
        const authorName =
          item.user?.userNickname || item.username || t("story.user");
        const isCaptionExpanded = Boolean(expandedCaptions[item.id]);
        const captionText = cleanMojibake(item.title || "");
        const isLongCaption = captionText.length > 110;

        return (
          <article
            key={item.id}
            className="mx-auto w-full max-w-[470px] border-b border-ig-rule pb-5"
          >
            {/* Header bài viết */}
            <header className="flex items-center justify-between py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to={
                    item.user?.id
                      ? `${Route.friend_profile}/${item.user.id}`
                      : Route.profile
                  }
                  className="shrink-0"
                >
                  <img
                    src={item.user?.userImage || "/default-avatar.png"}
                    alt={authorName}
                    className="h-9 w-9 rounded-full bg-ig-surface object-cover"
                  />
                </Link>
                <div className="flex min-w-0 items-center gap-1.5 text-[14px]">
                  <Link
                    to={
                      item.user?.id
                        ? `${Route.friend_profile}/${item.user.id}`
                        : Route.profile
                    }
                    className="truncate font-semibold text-ig-text hover:opacity-85"
                  >
                    {authorName}
                  </Link>
                  <span className="text-[12px] text-ig-faint">•</span>
                  <span className="shrink-0 text-[12px] text-ig-faint tabular-nums">
                    {formatTime(item.createdAt, t)}
                  </span>
                  <AccessIcon access={item?.access} t={t} />
                </div>
              </div>
            </header>

            {/* Khung media 4:5 hoặc 1:1 */}
            {item.media && item.media.length > 0 && (
              <div
                onDoubleClick={() => handleDoubleTapMedia(item)}
                style={{ touchAction: "pan-y" }}
                className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-media border border-ig-rule bg-ig-surface select-none"
              >
                {isMediaFailed ? (
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
                    className="h-full w-full object-contain"
                    src={currentMedia?.url}
                    controls
                    playsInline
                    muted
                  />
                ) : (
                  <img
                    className="h-full w-full object-cover"
                    src={currentMedia?.url}
                    alt={t("post.postImage")}
                    loading="lazy"
                    onError={() => handleMediaError(currentMediaKey)}
                  />
                )}

                {/* Double-tap heart overlay */}
                {doubleTapHeart[item.id] && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <Heart
                      size={84}
                      strokeWidth={1.5}
                      className="ig-double-tap-heart fill-ig-like text-ig-like"
                    />
                  </div>
                )}

                {/* Điều khiển carousel */}
                {item.media.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={t("story.previous")}
                      title={t("story.previous")}
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage(item.id, item.media.length);
                      }}
                      className="ig-press absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-ground/80 text-ig-text hover:bg-ig-raised"
                    >
                      <ChevronLeft size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      aria-label={t("story.next")}
                      title={t("story.next")}
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage(item.id, item.media.length);
                      }}
                      className="ig-press absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-ig-border bg-ig-ground/80 text-ig-text hover:bg-ig-raised"
                    >
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </button>
                    <div className=" absolute right-3 top-3 rounded-control border border-ig-border bg-ig-ground/80 px-2.5 py-0.5 text-[12px] font-medium text-ig-text tabular-nums">
                      {activeIdx + 1} / {item.media.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Thanh hành động và nội dung bài */}
            <div className="pt-3 text-[14px]">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    aria-label={t("newFed.like")}
                    title={t("newFed.like")}
                    onClick={() => handleLikePost(item.id, item.likesCount)}
                    className={`ig-press flex items-center justify-center ${
                      likes[item.id]
                        ? "text-ig-like"
                        : "text-ig-text hover:text-ig-muted"
                    } ${poppingHearts[item.id] ? "ig-heart-pop" : ""}`}
                  >
                    <Heart
                      size={24}
                      strokeWidth={1.5}
                      className={likes[item.id] ? "fill-current" : ""}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={t("newFed.comment")}
                    title={t("newFed.comment")}
                    onClick={() => handleModelComment(item)}
                    className="ig-press flex items-center justify-center text-ig-text hover:text-ig-muted"
                  >
                    <MessageCircle size={24} strokeWidth={1.5} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={t("post.save")}
                  title={t("post.save")}
                  className="ig-press flex items-center justify-center text-ig-text hover:text-ig-muted"
                >
                  <Bookmark size={24} strokeWidth={1.5} />
                </button>
              </div>

              <p className="mb-1.5 text-[14px] font-semibold text-ig-text tabular-nums">
                {item.likesCount || 0} {t("newFed.like")}
              </p>

              {captionText && (
                <p className="mb-1.5 text-[14px] leading-snug text-ig-text">
                  <span className="mr-1.5 font-semibold">{authorName}</span>
                  {isLongCaption && !isCaptionExpanded ? (
                    <>
                      {captionText.slice(0, 110)}…
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCaptions((prev) => ({
                            ...prev,
                            [item.id]: true,
                          }))
                        }
                        className="ml-1 text-[14px] text-ig-muted hover:text-ig-text"
                      >
                        {t("post.seeMore")}
                      </button>
                    </>
                  ) : (
                    captionText
                  )}
                </p>
              )}

              {Number(item.commentsCount) > 0 && (
                <button
                  type="button"
                  onClick={() => handleModelComment(item)}
                  className="block text-[14px] text-ig-muted hover:text-ig-text tabular-nums"
                >
                  {t("newFed.view")} {item.commentsCount}{" "}
                  {t("newFed.comment")}
                </button>
              )}
            </div>
          </article>
        );
      })}

      <ModalCart
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        post={selectedPost ? (postData.find((p) => p.id === selectedPost.id) || selectedPost) : null}
        onCommentAdded={handleCommentAdded}
        fetchPostData={fetchPostData}
        isLiked={selectedPost ? !!likes[selectedPost.id] : false}
        onToggleLikePost={handleLikePost}
      />
    </div>
  );
};

export default NewsFeedCart;
