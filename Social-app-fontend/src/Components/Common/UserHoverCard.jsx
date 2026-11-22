import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Send } from "lucide-react";
import instance from "../../Utils/AxiosApi/Axios";
import {
  handleGetUserById,
  handleGetFollowersByUser,
  handlePostFollower,
  handlePostUnfollower,
} from "../../Service/userApi";
import { handleGetAllPostByUserId } from "../../Service/postApi";
import { openMiniChatWithConversation } from "../../Redux/Reducer/chatSlice";
import Route from "../Routes/index";

// In-memory cache to make re-hovering instant; reset when active user changes.
const cardCache = new Map();
let cachedForUserId = null;

export const formatCompactNumber = (num) => {
  if (!num && num !== 0) return "0";
  const n = Number(num);
  if (isNaN(n)) return "0";
  if (n >= 1000000) {
    const val = (n / 1000000).toFixed(1).replace(/\.0$/, "");
    return `${val}M`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return `${val}K`;
  }
  return n.toString();
};

const UserHoverCard = ({ user, children, onSelectPost }) => {
  const { t } = useTranslation();
  const currentUser = useSelector((state) => state.login?.userInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positionAbove, setPositionAbove] = useState(false);

  const timerRef = useRef(null);
  const triggerRef = useRef(null);

  const targetUserId = user?.id;

  useEffect(() => {
    const nextUserId = currentUser?.id ?? null;
    if (cachedForUserId !== nextUserId) {
      cardCache.clear();
      cachedForUserId = nextUserId;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const loadUserData = async () => {
    if (!targetUserId) return;

    if (cardCache.has(targetUserId)) {
      const cached = cardCache.get(targetUserId);
      setStats(cached.stats);
      setPosts(cached.posts);
      setIsFollowing(cached.isFollowing);
      return;
    }

    setLoading(true);
    try {
      const [statsRes, postsRes, followersRes] = await Promise.allSettled([
        handleGetUserById(targetUserId),
        handleGetAllPostByUserId(targetUserId),
        handleGetFollowersByUser(targetUserId),
      ]);

      let loadedStats = null;
      if (statsRes.status === "fulfilled" && statsRes.value?.statusCode === 200) {
        loadedStats = statsRes.value.data;
      }

      let loadedPosts = [];
      if (postsRes.status === "fulfilled" && postsRes.value?.statusCode === 200) {
        loadedPosts = Array.isArray(postsRes.value.data)
          ? postsRes.value.data.slice(0, 3)
          : [];
      }

      let following = false;
      if (
        followersRes.status === "fulfilled" &&
        Array.isArray(followersRes.value?.data)
      ) {
        following = followersRes.value.data.some(
          (f) =>
            String(f.follower?.id || f.followerId || f.id) ===
            String(currentUser?.id)
        );
      }

      setStats(loadedStats);
      setPosts(loadedPosts);
      setIsFollowing(following);

      cardCache.set(targetUserId, {
        stats: loadedStats,
        posts: loadedPosts,
        isFollowing: following,
      });
    } catch (e) {
      console.error("Error loading hover card user data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // If trigger is near bottom of viewport, position card above
        if (window.innerHeight - rect.bottom < 280) {
          setPositionAbove(true);
        } else {
          setPositionAbove(false);
        }
      }
      setIsOpen(true);
      loadUserData();
    }, 250);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleToggleFollow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id || !targetUserId) return;

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    setStats((prev) => {
      if (!prev) return prev;
      const cur = Number(prev.followersCount || 0);
      return {
        ...prev,
        followersCount: nextState ? cur + 1 : Math.max(0, cur - 1),
      };
    });

    try {
      if (nextState) {
        await handlePostFollower(currentUser.id, targetUserId);
      } else {
        await handlePostUnfollower(currentUser.id, targetUserId);
      }
      if (cardCache.has(targetUserId)) {
        const cached = cardCache.get(targetUserId);
        cached.isFollowing = nextState;
      }
    } catch (err) {
      console.error("Follow error:", err);
      setIsFollowing(!nextState);
    }
  };

  const handleMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.id || !targetUserId) return;
    try {
      const res = await instance.post(
        `/chat/conversation/user/${targetUserId}?currentUserId=${currentUser.id}`
      );
      if (res?.data) {
        dispatch(openMiniChatWithConversation(res.data));
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      navigate(`/user/chat`);
    }
  };

  const isSelf = String(currentUser?.id) === String(targetUserId);
  const profileUrl = isSelf
    ? Route.profile
    : `${Route.friend_profile}/${targetUserId}`;

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`ig-modal-panel absolute ${
            positionAbove ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 z-50 w-[350px] rounded-panel border border-ig-border bg-ig-raised p-4 text-ig-text shadow-2xl select-none`}
        >
          {/* Top section: Avatar, names, handles */}
          <div className="mb-3.5 flex items-center gap-3.5">
            <Link to={profileUrl} className="shrink-0">
              <img
                src={
                  stats?.avatar ||
                  user?.userImage ||
                  "/default-avatar.png"
                }
                alt={user?.userNickname || ""}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/default-avatar.png";
                }}
                className="h-14 w-14 rounded-full border border-ig-border bg-ig-surface object-cover"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                to={profileUrl}
                className="block truncate text-[14px] font-semibold text-ig-text hover:underline"
              >
                {stats?.userNickname || user?.userNickname}
              </Link>

              <p className="truncate text-[13px] text-ig-muted">
                {stats?.userFullname ||
                  user?.userFullname ||
                  user?.userNickname}
              </p>
            </div>
          </div>

          {/* Stats section */}
          <div className="my-3 grid grid-cols-3 border-y border-ig-border py-2.5 text-center">
            <div>
              <p className="text-[14px] font-semibold text-ig-text tabular-nums">
                {formatCompactNumber(stats?.postsCount ?? posts.length)}
              </p>
              <p className="text-[12px] text-ig-muted">{t("userProfile.posts")}</p>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ig-text tabular-nums">
                {formatCompactNumber(stats?.followersCount ?? 0)}
              </p>
              <p className="text-[12px] text-ig-muted">
                {t("userProfile.followers")}
              </p>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ig-text tabular-nums">
                {formatCompactNumber(stats?.followingCount ?? 0)}
              </p>
              <p className="text-[12px] text-ig-muted">
                {t("userProfile.following")}
              </p>
            </div>
          </div>

          {/* 3 latest posts thumbnails */}
          {posts.length > 0 ? (
            <div className="mb-3.5 grid h-24 grid-cols-3 gap-1.5 overflow-hidden rounded-media">
              {posts.map((post, idx) => {
                const mediaUrl = post.media?.[0]?.url;
                const isVideo = mediaUrl?.endsWith(".mp4");
                return (
                  <div
                    key={post.id || idx}
                    onClick={() => {
                      if (onSelectPost) {
                        onSelectPost(post);
                      } else {
                        navigate(profileUrl);
                      }
                    }}
                    className="group relative h-full w-full cursor-pointer overflow-hidden bg-ig-surface"
                  >
                    {isVideo ? (
                      <video
                        src={mediaUrl}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default-avatar.png";
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ig-faint">
                        <ImageIcon size={18} strokeWidth={1.5} aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-120 group-hover:opacity-100" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-3.5 flex h-20 items-center justify-center rounded-lg bg-ig-surface text-[12px] text-ig-faint">
              {loading ? t("common.loading") : t("post.emptyFeedTitle")}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isSelf && (
              <>
                <button
                  type="button"
                  onClick={handleMessage}
                  className="ig-press flex flex-1 items-center justify-center gap-1.5 rounded-control bg-ig-accent py-1.5 text-[14px] font-semibold text-ig-text hover:opacity-90"
                >
                  <Send size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>{t("userProfile.message")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`ig-press flex-1 rounded-control py-1.5 text-[14px] font-semibold ${
                    isFollowing
                      ? "border border-ig-border bg-ig-surface text-ig-text hover:bg-ig-ground"
                      : "bg-ig-accent text-ig-text hover:opacity-90"
                  }`}
                >
                  {isFollowing
                    ? t("userProfile.following")
                    : t("userProfile.follow")}
                </button>
              </>
            )}

            {isSelf && (
              <Link
                to={Route.profile}
                className="ig-press w-full rounded-control border border-ig-border bg-ig-surface py-1.5 text-center text-[14px] font-semibold text-ig-text hover:bg-ig-ground"
              >
                {t("LargeNav.profile")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHoverCard;
