import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Route from "../../Components/Routes/index";
import {
  handleGetAllUser,
  handleGetFollowersByUser,
  handlePostFollower,
} from "../../Service/UserAPI";
import { useWebSocket } from "../../Utils/configCallVideo/websocket";
import { useTranslation } from "react-i18next";
import { RowListSkeleton } from "../Common/FlatSkeleton";

const RecommendUser = () => {
  const [userList, setUserList] = useState([]);
  const [listOfFollowers, setListOfFollowers] = useState([]);
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
      const [usersResponse, followersResponse] = await Promise.all([
        handleGetAllUser(),
        handleGetFollowersByUser(currentUserId),
      ]);

      const allUsers = Array.isArray(usersResponse?.data)
        ? usersResponse.data
        : [];
      const followers = Array.isArray(followersResponse?.data)
        ? followersResponse.data
        : [];
      setListOfFollowers(followers);

      const followerIds = followers
        .map((item) => item.follower?.id)
        .filter(Boolean);
      const filteredUsers = allUsers.filter(
        (user) => user.id !== currentUserId && !followerIds.includes(user.id)
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
        const followersResponse = await handleGetFollowersByUser(currentUserId);
        setListOfFollowers(
          Array.isArray(followersResponse?.data) ? followersResponse.data : []
        );
      }
    } catch (error) {
      setFollowedUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(followedId);
        return newSet;
      });
      console.error("Error following user:", error);
    }
  };

  return (
    <aside
      aria-label={t("RecommentUser.suggestedForYou")}
      className="sticky top-6 hidden w-[320px] shrink-0 self-start bg-ig-ground text-ig-text xl:block"
    >
      {/* Tài khoản hiện tại (không lộ email) */}
      <Link
        to={Route.profile}
        className="flex h-14 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-ig-surface"
      >
        <img
          src={currentUserAvatar}
          alt={currentUserNickname}
          className="h-11 w-11 shrink-0 rounded-full bg-ig-surface object-cover"
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

      {isLoading ? (
        <div className="mt-6">
          <RowListSkeleton count={4} rowHeight="h-14" />
        </div>
      ) : (
        <>
          {/* Danh sách người theo dõi */}
          {listOfFollowers.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 px-2 text-[14px] font-semibold text-ig-muted">
                {t("RecommentUser.followers")}
              </h2>
              <div className="flex flex-col">
                {listOfFollowers.slice(0, 5).map((item) => {
                  const follower = item.follower;
                  if (!follower) return null;
                  return (
                    <Link
                      key={follower.id}
                      to={`${Route.friend_profile}/${follower.id}`}
                      className="flex h-14 items-center justify-between rounded-lg px-2 transition-colors hover:bg-ig-surface"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={follower.userImage || "/default-avatar.png"}
                          alt={follower.userNickname || ""}
                          className="h-9 w-9 shrink-0 rounded-full bg-ig-surface object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-ig-text">
                            {follower.userNickname}
                          </p>
                          {follower.userFullname && (
                            <p className="truncate text-[12px] text-ig-muted">
                              {follower.userFullname}
                            </p>
                          )}
                        </div>
                      </div>
                      {!item.friend && !followedUsers.has(follower.id) && (
                        <button
                          type="button"
                          className="ig-press shrink-0 text-[12px] font-semibold text-ig-accent hover:opacity-85"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddFollow(follower.id);
                          }}
                        >
                          {t("RecommentUser.follow")}
                        </button>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Danh sách gợi ý cho bạn */}
          <section className="mt-6">
            <h2 className="mb-2 px-2 text-[14px] font-semibold text-ig-muted">
              {t("RecommentUser.suggestedForYou")}
            </h2>
            {userList.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-ig-faint">
                {t("RecommentUser.noSuggestions")}
              </p>
            ) : (
              <div className="flex flex-col">
                {userList.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    to={`${Route.friend_profile}/${item.id}`}
                    className="flex h-14 items-center justify-between rounded-lg px-2 transition-colors hover:bg-ig-surface"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={item.userImage || "/default-avatar.png"}
                        alt={item.userNickname || ""}
                        className="h-9 w-9 shrink-0 rounded-full bg-ig-surface object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ig-text">
                          {item.userNickname}
                        </p>
                        {item.userFullname && (
                          <p className="truncate text-[12px] text-ig-muted">
                            {item.userFullname}
                          </p>
                        )}
                      </div>
                    </div>
                    {!followedUsers.has(item.id) && (
                      <button
                        type="button"
                        className="ig-press shrink-0 text-[12px] font-semibold text-ig-accent hover:opacity-85"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddFollow(item.id);
                        }}
                      >
                        {t("RecommentUser.follow")}
                      </button>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </aside>
  );
};

export default RecommendUser;
