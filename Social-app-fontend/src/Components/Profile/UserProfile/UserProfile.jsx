import React, { useEffect, useState, useCallback } from "react";
import { handleGetUserById } from "../../../Service/UserAPI";
import { getAllStoryByUserId } from "../../../Service/storyApi";
import { handleGetAllPostByUserId } from "../../../Service/postApi";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import ControllFollower from "./ControllFlower/ControllFlower";
import ControllFlowering from "./ControllFlower/ControllFlowering";
import { useTranslation } from "react-i18next";
import ModalCart from "../../NewsFeed/NewsFeedCart/ModalCart/ModalCart";
import MoreMenu from "../../LargeNav/MoreMenu/MoreMenu";
import EmptyState from "../../Common/EmptyState";
import { Camera, Heart, Menu, MessageCircle } from "lucide-react";

const UserProfile = () => {
  const [dataUser, setDataUser] = useState({});
  const [dataStory, setDataStory] = useState([]);
  const [dataPost, setDataPost] = useState([]);
  const userredux = useSelector((state) => state.login.userInfo);
  const [showModal, setShowModal] = useState(false);
  const [showModalFlowering, setShowModalFlowering] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navigate = useNavigate();
  const [t] = useTranslation();

  const fetchDataUser = useCallback(async () => {
    if (!userredux?.id) return;
    let res = await handleGetUserById(userredux.id);
    if (res.statusCode === 200 && res.data) {
      setDataUser(res.data);
    }
  }, [userredux?.id]);

  const fetchDataStory = useCallback(async () => {
    if (!userredux?.id) return;
    let res = await getAllStoryByUserId(userredux.id);
    if (res.statusCode === 200 && res.data) {
      setDataStory(res.data);
    }
  }, [userredux?.id]);

  const fetchDataPost = useCallback(async () => {
    if (!userredux?.id) return;
    let res = await handleGetAllPostByUserId(userredux.id);
    if (res.statusCode === 200 && res.data) {
      setDataPost(res.data);
    }
  }, [userredux?.id]);

  useEffect(() => {
    fetchDataUser();
    fetchDataStory();
    fetchDataPost();
  }, [fetchDataUser, fetchDataStory, fetchDataPost]);

  const hasStories = Array.isArray(dataStory) && dataStory.length > 0;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[935px] bg-ig-ground px-4 py-6 text-ig-text md:px-8 md:py-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Avatar */}
        <div className="flex items-center justify-between sm:block">
          <div
            className={`h-24 w-24 shrink-0 rounded-full p-[2px] md:h-36 md:w-36 ${
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

          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => setShowMobileMenu((prev) => !prev)}
              aria-label={t("LargeNav.more")}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-ig-border bg-ig-surface text-ig-text"
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
            <MoreMenu
              showMenu={showMobileMenu}
              setShowMenu={setShowMobileMenu}
              positionClassName="absolute right-0 top-12 z-50 origin-top-right"
            />
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.02em] text-ig-text">
              {dataUser.username}
            </h1>
            <Link
              to={`/edit-profile/${dataUser.userId}`}
              className="ig-press rounded-lg border border-ig-border bg-ig-surface px-4 py-1.5 text-[13px] font-semibold text-ig-text hover:bg-ig-raised"
            >
              {t("userProfile.editProfile")}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-6 text-[14px] tabular-nums">
            <span>
              <strong className="font-semibold text-ig-text">
                {Array.isArray(dataPost) ? dataPost.length : (dataUser.postsCount ?? 0)}
              </strong>{" "}
              <span className="text-ig-muted">{t("userProfile.posts")}</span>
            </span>
            <button
              type="button"
              className="text-left hover:opacity-80"
              onClick={() => setShowModal(true)}
            >
              <strong className="font-semibold text-ig-text">
                {dataUser.followersCount ?? 0}
              </strong>{" "}
              <span className="text-ig-muted">
                {t("userProfile.followers")}
              </span>
            </button>
            <button
              type="button"
              className="text-left hover:opacity-80"
              onClick={() => setShowModalFlowering(true)}
            >
              <strong className="font-semibold text-ig-text">
                {dataUser.followingCount ?? 0}
              </strong>{" "}
              <span className="text-ig-muted">
                {t("userProfile.following")}
              </span>
            </button>
          </div>
          {dataUser.bio && (
            <p className="mt-3 max-w-[60ch] text-[14px] leading-[1.45] text-ig-text">
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
              className="flex shrink-0 flex-col items-center text-[12px] text-ig-text"
              onClick={() => {
                navigate(`/user/story/${item.id}`);
              }}
            >
              <img
                src={item.url}
                alt=""
                className="h-16 w-16 rounded-full border border-ig-border object-cover md:h-20 md:w-20"
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
                    className="h-full w-full object-cover"
                    alt=""
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

      <ControllFollower
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        id={dataUser.userId}
        fetchDataUser={fetchDataUser}
      />
      <ControllFlowering
        isOpening={showModalFlowering}
        onClosing={() => setShowModalFlowering(false)}
        id={dataUser.userId}
      />
      <ModalCart
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        post={selectedPost}
        userredux={userredux}
      />
    </div>
  );
};

export default UserProfile;
