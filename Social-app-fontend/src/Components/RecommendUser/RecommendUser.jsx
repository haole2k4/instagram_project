import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Route from "../../Components/Routes/index";
import {
  handleGetAllUser,
  handleGetFollowingByUser,
  handlePostFollower,
} from "../../Service/UserAPI";
import { useWebSocket } from "../../Utils/configCallVideo/websocket";
import { useTranslation } from "react-i18next";
import { RowListSkeleton } from "../Common/FlatSkeleton";

const FOOTER_LINKS = [
  "About",
  "Help",
  "Press",
  "API",
  "Jobs",
  "Privacy",
  "Terms",
  "Locations",
  "Language",
];

const RecommendUser = () => {
  const [userList, setUserList] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const userApp = useSelector((state) => state.login);
  const { sendFollowNotification } = useWebSocket();
  const [t] = useTranslation();

  const currentUserId = userApp.userInfo?.id;
  const currentUserAvatar =
    userApp.userInfo?.userImage ||
    userApp.userInfo?.avatar ||
    "/default-avatar.png";
  const currentUserNickname =
    userApp.userInfo?.userNickname || userApp.userInfo?.nikName || "";
  const currentUserFullname = userApp.userInfo?.userFullname || "";

  const fetchData = useCallback(async () => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [usersResponse, followingResponse] = await Promise.all([
        handleGetAllUser(),
        handleGetFollowingByUser(currentUserId),
      ]);

      const allUsers = Array.isArray(usersResponse?.data)
        ? usersResponse.data
        : [];
      const following = Array.isArray(followingResponse?.data)
        ? followingResponse.data
        : [];

      const followingIds = new Set(
        following.map((item) => item.following?.id || item.id).filter(Boolean)
      );

      const filteredUsers = allUsers.filter(
        (user) => user.id !== currentUserId && !followingIds.has(user.id)
      );

      setUserList(filteredUsers);
    } catch (error) {
      console.error("Error fetching recommended users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddFollow = async (followedId) => {
    setFollowedUsers((prev) => new Set([...prev, followedId]));

    try {
      const response = await handlePostFollower(currentUserId, followedId);
      if (response.statusCode === 201 || response.statusCode === 200) {
        sendFollowNotification({ toUserId: String(followedId) });
      }
    } catch (error) {
      setFollowedUsers((prev) => {
        const next = new Set(prev);
        next.delete(followedId);
        return next;
      });
      console.error("Error following user:", error);
    }
  };

  return (
    <aside
      aria-label={t("RecommentUser.suggestedForYou")}
      className="sticky top-6 hidden w-[320px] shrink-0 self-start bg-ig-ground text-ig-text xl:block"
    >
      {/* Tài khoản hiện tại */}
      <Link
        to={Route.profile}
        className="flex h-14 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-ig-surface"
      >
        <img
          src={currentUserAvatar}
          alt={currentUserNickname}
          className="h-11 w-11 shrink-0 rounded-full bg-ig-surface object-cover"
          onError={(e) => {
            e.currentTarget.src = "/default-avatar.png";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ig-text">
            {currentUserNickname}
          </p>
          {currentUserFullname && (
            <p className="truncate text-[12px] text-ig-muted">
              {currentUserFullname}
            </p>
          )}
        </div>
      </Link>

      {/* Danh sách gợi ý cho bạn */}
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between px-2">
          <h2 className="text-[14px] font-semibold text-ig-muted">
            {t("RecommentUser.suggestedForYou")}
          </h2>
          <Link
            to={Route.search}
            className="text-[12px] font-semibold text-ig-text transition-colors hover:text-ig-muted"
          >
            {t("RecommentUser.seeAll")}
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-2">
            <RowListSkeleton count={5} rowHeight="h-14" />
          </div>
        ) : userList.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-ig-faint">
            {t("RecommentUser.noSuggestions")}
          </p>
        ) : (
          <div className="flex flex-col">
            {userList.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex h-14 items-center justify-between rounded-lg px-2 transition-colors hover:bg-ig-surface"
              >
                <Link
                  to={`${Route.friend_profile}/${item.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <img
                    src={item.userImage || "/default-avatar.png"}
                    alt={item.userNickname || ""}
                    className="h-10 w-10 shrink-0 rounded-full bg-ig-surface object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.png";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ig-text hover:underline">
                      {item.userNickname}
                    </p>
                    <p className="truncate text-[12px] text-ig-muted">
                      {item.userFullname || t("RecommentUser.suggestedForYou")}
                    </p>
                  </div>
                </Link>
                {followedUsers.has(item.id) ? (
                  <span className="shrink-0 text-[12px] font-semibold text-ig-muted">
                    {t("profile.following")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="ig-press shrink-0 text-[12px] font-semibold text-ig-accent transition-colors hover:text-white"
                    onClick={() => handleAddFollow(item.id)}
                  >
                    {t("RecommentUser.follow")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Meta Footer */}
      <footer className="mt-8 px-2 text-[11px] text-ig-faint select-none">
        <nav className="flex flex-wrap gap-x-2 gap-y-1">
          {FOOTER_LINKS.map((link, idx) => (
            <span key={link} className="cursor-pointer hover:underline">
              {link}
              {idx < FOOTER_LINKS.length - 1 && (
                <span className="ml-2 text-ig-faint">·</span>
              )}
            </span>
          ))}
        </nav>
        <p className="mt-4 text-[11px] uppercase tracking-wide text-ig-faint">
          © 2026 INSTAGRAM FROM META
        </p>
      </footer>
    </aside>
  );
};

export default RecommendUser;
