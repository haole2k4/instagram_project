import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import TextEllipse from "../../Utils/TextEllipse/TextEllipse";
import { getStoryByFollowing } from "../../Service/storyApi";
import Route from "../../Components/Routes/index";
import { StoryBarSkeleton } from "../Common/FlatSkeleton";

const VIEWED_STORIES_KEY = "ig_viewed_stories";

const getViewedStories = () => {
  try {
    const raw = localStorage.getItem(VIEWED_STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const Stories = () => {
  const { t } = useTranslation();
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState(() => getViewedStories());
  const { userInfo } = useSelector((state) => state.login);

  useEffect(() => {
    let mounted = true;
    const fetchStories = async () => {
      if (!userInfo?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await getStoryByFollowing(userInfo.id);
        if (mounted) {
          setStories(Array.isArray(response?.data) ? response.data : []);
          setViewedIds(getViewedStories());
        }
      } catch (error) {
        console.error("Failed to fetch stories:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchStories();
    return () => {
      mounted = false;
    };
  }, [userInfo?.id]);

  return (
    <section
      aria-label={t("story.sectionLabel")}
      className="mb-4 w-full border-b border-ig-rule"
    >
      {isLoading ? (
        <StoryBarSkeleton count={6} />
      ) : (
        <div className="no-scrollbar flex w-full items-center gap-4 overflow-x-auto py-3">
          {/* Nút tạo story nhanh */}
          <Link
            to={Route.create_story}
            className="flex shrink-0 flex-col items-center justify-center"
            aria-label={t("story.createTitle")}
          >
            <div className="story-item-avatar relative flex h-[74px] w-[74px] items-center justify-center rounded-full border border-ig-raised bg-ig-surface p-[2px]">
              <img
                src={
                  userInfo?.avatar ||
                  userInfo?.userImage ||
                  "/default-avatar.png"
                }
                alt={userInfo?.userNickname || ""}
                className="h-full w-full rounded-full object-cover opacity-80"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.png";
                }}
              />
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ig-ground bg-ig-accent text-ig-text">
                <Plus size={12} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <TextEllipse username={t("story.yourStory")} viewed={false} />
          </Link>

          {stories.map((item) => {
            const isViewed = viewedIds.includes(item.id);
            const nickname = item.user?.userNickname || t("story.user");
            return (
              <Link
                to={`${Route.story}/${item.id}`}
                key={item.id}
                className="flex shrink-0 flex-col items-center justify-center"
              >
                <div
                  className={`story-item-avatar h-[74px] w-[74px] rounded-full p-[2px] ${
                    isViewed
                      ? "border border-ig-raised bg-transparent opacity-65"
                      : "ig-ring-story"
                  }`}
                >
                  <div className="h-full w-full rounded-full bg-ig-ground p-[2px]">
                    <img
                      src={
                        item.user?.avatar ||
                        item.user?.userImage ||
                        "/default-avatar.png"
                      }
                      alt={nickname}
                      className="h-full w-full rounded-full bg-ig-surface object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/default-avatar.png";
                      }}
                    />
                  </div>
                </div>
                <TextEllipse username={nickname} viewed={isViewed} />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Stories;
