import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Route from "../../../Components/Routes/index";
const MenuFormGenerate = ({ showCreateModal, setShowCreateModal }) => {
  const [t] = useTranslation();

  if (!showCreateModal) return null;

  return (
    <div className="relative">
      <div className="nav-popover absolute bottom-0 left-[60px]">
        <h2 className="mb-3 text-center text-base font-semibold text-ig-text">
          {t("Create New")}
        </h2>

        <Link
          to={Route.create_newsfeed}
          onClick={() => setShowCreateModal(false)}
          className="mb-2 block w-full rounded-control bg-ig-accent py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          {t("CreateNew.tellMeWhatYouThink")}
        </Link>

        <Link
          to={Route.create_story}
          onClick={() => setShowCreateModal(false)}
          className="mb-2 block w-full rounded-control bg-ig-surface py-2.5 text-center text-sm font-semibold text-ig-text hover:bg-ig-raised"
        >
          {t("CreateNew.howDoYouFeelToday")}
        </Link>

        <button
          onClick={() => setShowCreateModal(false)}
          className="mt-3 w-full py-2 text-sm text-ig-muted hover:text-ig-text"
        >
          {t("CreateNew.cancel")}
        </button>
      </div>
    </div>
  );
};

export default MenuFormGenerate;
