import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, Instagram, PlusSquare } from "lucide-react";
import NewsFeed from "../../Pages/NewsFeed/index";
import Stories from "../../Pages/Stories/index";
import MenuFormGenerate from "../../Components/LargeNav/FormGenerate/FormGenerate";
import Route from "../../Components/Routes/index";

const Home = () => {
  const { t } = useTranslation();
  const [showMobileCreate, setShowMobileCreate] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[630px]">
      <h1 className="sr-only">{t("LargeNav.home")}</h1>

      {/* Thanh điều hướng phụ trên mobile cho nút Tạo và Thông báo */}
      <header className="mb-2 flex h-12 items-center justify-between border-b border-ig-rule md:hidden">
        <Link
          to={Route.default_session}
          className="flex items-center gap-2 text-[16px] font-semibold text-ig-text"
        >
          <Instagram size={20} strokeWidth={1.5} aria-hidden="true" />
          <span>Instagram</span>
        </Link>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMobileCreate((prev) => !prev)}
              aria-expanded={showMobileCreate}
              aria-label={t("LargeNav.create")}
              title={t("LargeNav.create")}
              className="nav-icon-btn h-10 w-10"
            >
              <PlusSquare size={22} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <MenuFormGenerate
              showCreateModal={showMobileCreate}
              setShowCreateModal={setShowMobileCreate}
              positionClassName="right-0 top-11 origin-top-right"
            />
          </div>

          <Link
            to={Route.notification}
            aria-label={t("LargeNav.notifications")}
            title={t("LargeNav.notifications")}
            className="nav-icon-btn h-10 w-10"
          >
            <Heart size={22} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <Stories />
      <NewsFeed />
    </div>
  );
};

export default Home;
