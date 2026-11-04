import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Send, Check } from "lucide-react";
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

// In-memory cache to make re-hovering instant
const cardCache = new Map();

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
  const currentUser = useSelector((state) => state.user.user);
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

    // Optimistically update followersCount in stats
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
      // Update cache
      if (cardCache.has(targetUserId)) {
        const cached = cardCache.get(targetUserId);
        cached.isFollowing = nextState;
      }
    } catch (err) {
      console.error("Follow error:", err);
      // Revert on error
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
      if (res.data) {
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
          className={`absolute ${
            positionAbove ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 z-50 w-[350px] rounded-2xl border border-white/10 bg-[#1c1c1c] p-4 text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Top section: Avatar, names, handles */}
          <div className="flex items-center gap-3.5 mb-3.5">
            <Link to={profileUrl} className="shrink-0 group">
              <div className="rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-[2px]">
                <img
                  src={
                    stats?.avatar ||
                    user?.userImage ||
                    "/default-avatar.png"
                  }
                  alt={user?.userNickname || ""}
                  className="h-14 w-14 rounded-full border-2 border-black object-cover transition-transform group-hover:scale-105"
                />
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link
                  to={profileUrl}
                  className="truncate text-[15px] font-bold text-white hover:underline"
                >
                  {stats?.userNickname || user?.userNickname}
                </Link>
                {/* Verified badge */}
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0095f6] text-white"
                  title="Verified"
                >
                  <Check size={10} strokeWidth={3} />
                </div>
              </div>

              <p className="truncate text-[13px] text-neutral-400">
                {stats?.userFullname ||
                  user?.userFullname ||
                  user?.userNickname}
              </p>

              {/* Threads badge */}
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">
                <span>@</span>
                <span className="truncate max-w-[120px]">
                  {stats?.userNickname || user?.userNickname}
                </span>
              </div>
            </div>
          </div>

          {/* Stats section */}
          <div className="grid grid-cols-3 border-y border-white/10 py-2.5 text-center my-3">
            <div>
              <p className="text-[15px] font-bold text-white tabular-nums">
                {formatCompactNumber(stats?.postsCount ?? posts.length)}
              </p>
              <p className="text-[12px] text-neutral-400">posts</p>
            </div>
            <div>
              <p className="text-[15px] font-bold text-white tabular-nums">
                {formatCompactNumber(stats?.followersCount ?? 0)}
              </p>
              <p className="text-[12px] text-neutral-400">followers</p>
            </div>
            <div>
              <p className="text-[15px] font-bold text-white tabular-nums">
                {formatCompactNumber(stats?.followingCount ?? 0)}
              </p>
              <p className="text-[12px] text-neutral-400">following</p>
            </div>
          </div>

          {/* 3 latest posts thumbnails */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 h-24 overflow-hidden rounded-lg mb-3.5">
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
                    className="group relative h-full w-full cursor-pointer overflow-hidden bg-neutral-900"
                  >
                    {isVideo ? (
                      <video
                        src={mediaUrl}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        muted
                      />
                    ) : (
                      <img
                        src={mediaUrl || "/default-placeholder.png"}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg bg-neutral-900/50 text-[12px] text-neutral-500 mb-3.5">
              {loading ? "Đang tải..." : "Chưa có bài viết nào"}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isSelf && (
              <>
                <button
                  type="button"
                  onClick={handleMessage}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0095f6] py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75"
                >
                  <Send size={14} strokeWidth={2} />
                  <span>Message</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-colors ${
                    isFollowing
                      ? "bg-[#363636] text-white hover:bg-[#2e2e2e]"
                      : "bg-[#0095f6] text-white hover:opacity-90"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </>
            )}

            {isSelf && (
              <Link
                to={Route.profile}
                className="w-full rounded-lg bg-[#363636] py-1.5 text-center text-[13px] font-semibold text-white hover:bg-[#2e2e2e]"
              >
                Trang cá nhân
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserHoverCard;
