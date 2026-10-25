import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  handleGetUserById,
  handleGetFollowersByUser,
  handlePostFollower,
  handlePostUnfollower,
} from "../../../Service/UserAPI";
import { handleGetAllPostByUserId } from "../../../Service/postApi";
import { getAllStoryByUserId } from "../../../Service/storyApi";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ModalCart from "../../NewsFeed/NewsFeedCart/ModalCart/ModalCart";
import EmptyState from "../../Common/EmptyState";
import { Camera, Heart, MessageCircle } from "lucide-react";
import { getOrCreateConversation } from "../../../Redux/Reducer/chatSlice";
import { useWebSocket } from "../../../Utils/configCallVideo/websocket";

const FriendProfile = () => {
  const { id } = useParams();
  const [dataUser, setDataUser] = useState({});
  const [dataStory, setDataStory] = useState([]);
  const [dataPost, setDataPost] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.login?.userInfo);
  const { sendFollowNotification } = useWebSocket();

  const fectDataUserbyId = useCallback(async () => {
    try {
      const res = await handleGetUserById(id);
      if (res?.statusCode === 200 && res.data) {
        setDataUser(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const fectDataStory = useCallback(async () => {
    try {
      const res = await getAllStoryByUserId(id);
      if (res?.statusCode === 200 && res.data) {
        setDataStory(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const fectDataPost = useCallback(async () => {
    try {
      const res = await handleGetAllPostByUserId(id);
      if (res?.statusCode === 200 && res.data) {
        setDataPost(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const checkFollowingStatus = useCallback(async () => {
    if (!currentUser?.id || !id) return;
    try {
      const res = await handleGetFollowersByUser(id);
      const list = Array.isArray(res?.data) ? res.data : [];
      const isF = list.some(
        (f) =>
          String(f.follower?.id || f.followerId || f.id) ===
          String(currentUser.id)
      );
      setIsFollowing(isF);
    } catch (e) {
      console.error(e);
    }
  }, [currentUser?.id, id]);

  useEffect(() => {
    fectDataUserbyId();
    fectDataStory();
    fectDataPost();
    checkFollowingStatus();
  }, [fectDataUserbyId, fectDataStory, fectDataPost, checkFollowingStatus]);

  const handleToggleFollow = async () => {
    if (!currentUser?.id) {
      navigate("/login");
      return;
    }
    const targetId = Number(id);
    const currId = Number(currentUser.id);

    try {
      if (isFollowing) {
        setIsFollowing(false);
        setDataUser((prev) => ({
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 1) - 1),
        }));
        await handlePostUnfollower(currId, targetId);
      } else {
        setIsFollowing(true);
        setDataUser((prev) => ({
          ...prev,
          followersCount: (prev.followersCount || 0) + 1,
        }));
        await handlePostFollower(currId, targetId);
        if (sendFollowNotification) {
          sendFollowNotification({ toUserId: String(targetId) });
        }
      }
    } catch (e) {
      console.error("Follow toggle failed:", e);
      checkFollowingStatus();
    }
  };

  const handleMessageUser = async () => {
    if (!currentUser?.id) {
      navigate("/login");
      return;
    }
    try {
      const resultAction = await dispatch(
        getOrCreateConversation({
          userId: currentUser.id,
          otherUserId: id,
        })
      );
      if (
        getOrCreateConversation.fulfilled.match(resultAction) &&
        resultAction.payload?.id
      ) {
        navigate(`/user/chat/${resultAction.payload.id}`);
      } else {
        navigate("/user/chat");
      }
    } catch (err) {
      navigate("/user/chat");
    }
  };

  const hasStories = Array.isArray(dataStory) && dataStory.length > 0;
  const postsCount = Array.isArray(dataPost)
    ? dataPost.length
    : dataUser.postsCount ?? 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[935px] bg-ig-ground px-4 py-6 text-ig-text md:px-8 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-6 sm:gap-8">
        <div
          className={`h-24 w-24 shrink-0 rounded-full p-[2px] md:h-32 md:w-32 ${
            hasStories ? "ig-ring-story" : "border border-ig-border"
          }`}
        >
          <div className="h-full w-full rounded-full bg-ig-ground p-[2px]">
            <img
              src={
                dataUser.avatar || dataUser.userImage || "/default-avatar.png"
              }
              alt={dataUser.username || "Avatar"}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/default-avatar.png";
              }}
            />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ig-text">
              {dataUser.username || dataUser.userNickname || dataUser.nikName}
            </h1>
            {currentUser?.id && String(currentUser.id) !== String(id) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`rounded-lg px-4 py-1.5 text-[14px] font-semibold transition-opacity active:scale-[.97] ${
                    isFollowing
                      ? "border border-ig-border bg-ig-surface text-ig-text hover:bg-ig-raised"
                      : "bg-ig-accent text-ig-text hover:opacity-90"
                  }`}
                >
                  {isFollowing
                    ? t("userProfile.following")
                    : t("userProfile.follow")}
                </button>
                <button
                  type="button"
                  onClick={handleMessageUser}
                  className="rounded-lg border border-ig-border bg-ig-surface px-4 py-1.5 text-[14px] font-semibold text-ig-text transition-colors hover:bg-ig-raised active:scale-[.97]"
                >
                  {t("userProfile.message")}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-6 text-[14px] tabular-nums">
            <span>
              <strong className="font-semibold text-ig-text">
                {postsCount}
              </strong>{" "}
              <span className="text-ig-muted">{t("userProfile.posts")}</span>
            </span>
            <span>
              <strong className="font-semibold text-ig-text">
                {dataUser.followersCount ?? 0}
              </strong>{" "}
              <span className="text-ig-muted">
                {t("userProfile.followers")}
              </span>
            </span>
            <span>
              <strong className="font-semibold text-ig-text">
                {dataUser.followingCount ?? 0}
              </strong>{" "}
              <span className="text-ig-muted">
                {t("userProfile.following")}
              </span>
            </span>
          </div>
          {dataUser.bio && (
            <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.45] text-ig-text">
              {dataUser.bio}
            </p>
          )}
        </div>
      </div>

      {/* Story Highlights */}
      {hasStories && (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {dataStory.map((item, index) => (
            <button
              key={item.id || index}
              type="button"
              className="flex shrink-0 flex-col items-center text-[12px]"
              onClick={() => {
                navigate(`/user/story/${item.id}`);
              }}
            >
              <img
                src={item.url}
                alt=""
                className="h-16 w-16 rounded-full border border-ig-border object-cover"
              />
              <span className="mt-1.5 max-w-[72px] truncate text-ig-muted">
                {t("userProfile.storyHighlights")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex justify-center border-t border-ig-rule">
        <button
          type="button"
          className="mx-4 -mt-px border-t border-ig-text py-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-ig-text"
        >
          {t("userProfile.posts")}
        </button>
        <button
          type="button"
          className="mx-4 py-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-ig-muted"
        >
          {t("userProfile.tagged")}
        </button>
      </div>

      {/* Posts Grid: 1 bài = 1 ô */}
      {!dataPost || dataPost.length === 0 ? (
        <EmptyState icon={Camera} title={t("post.emptyFeedTitle")} />
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-1">
          {dataPost.map((item) => {
            const primaryMedia = item?.media?.[0];
            const isVideo =
              primaryMedia?.type === "VIDEO" ||
              primaryMedia?.url?.endsWith(".mp4");
            return (
              <button
                key={item.id}
                type="button"
                className="group relative aspect-square w-full overflow-hidden bg-ig-surface"
                onClick={() => {
                  setSelectedPost(item);
                  setIsOpen(true);
                }}
              >
                {isVideo ? (
                  <video
                    src={primaryMedia?.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={
                      primaryMedia?.url ||
                      "https://via.placeholder.com/150"
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="flex gap-5 text-[14px] font-semibold text-ig-text tabular-nums">
                    <div className="flex items-center gap-1.5">
                      <Heart
                        size={18}
                        className="fill-current text-ig-text"
                        aria-hidden="true"
                      />
                      <span>{item.likesCount ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle
                        size={18}
                        className="fill-current text-ig-text"
                        aria-hidden="true"
                      />
                      <span>{item.commentsCount ?? 0}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ModalCart isOpen={isOpen} setIsOpen={setIsOpen} post={selectedPost} />
    </div>
  );
};

export default FriendProfile;