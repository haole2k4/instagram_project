import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Route from "../../../Components/Routes/index";

const MenuFormGenerate = ({
  showCreateModal,
  setShowCreateModal,
  positionClassName = "bottom-0 left-[60px] origin-bottom-left",
}) => {
  const [t] = useTranslation();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showCreateModal) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowCreateModal(false);
      }
    };

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowCreateModal(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCreateModal, setShowCreateModal]);

  if (!showCreateModal) return null;

  return (
    <div ref={menuRef} className="relative">
      <div
        role="dialog"
        aria-label={t("CreateNew.title")}
        className={`nav-popover absolute ${positionClassName}`}
      >
        <p className="mb-3 text-center text-[14px] font-semibold text-ig-text">
          {t("CreateNew.title")}
        </p>

        <Link
          to={Route.create_newsfeed}
          onClick={() => setShowCreateModal(false)}
          className="ig-press mb-2 block w-full rounded-control bg-ig-accent py-2.5 text-center text-[14px] font-semibold text-ig-text hover:opacity-90"
        >
          {t("CreateNew.tellMeWhatYouThink")}
        </Link>

        <Link
          to={Route.create_story}
          onClick={() => setShowCreateModal(false)}
          className="ig-press mb-2 block w-full rounded-control border border-ig-border bg-ig-surface py-2.5 text-center text-[14px] font-semibold text-ig-text hover:bg-ig-raised"
        >
          {t("CreateNew.howDoYouFeelToday")}
        </Link>

        <button
          type="button"
          onClick={() => setShowCreateModal(false)}
          className="mt-1 w-full py-1.5 text-[14px] text-ig-muted hover:text-ig-text"
        >
          {t("CreateNew.cancel")}
        </button>
      </div>
    </div>
  );
};

export default MenuFormGenerate;
