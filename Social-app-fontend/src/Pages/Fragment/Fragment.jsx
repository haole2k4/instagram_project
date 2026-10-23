import { useNavigate, useRoutes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import routes from "../../Routes/config";
import EmptyState from "../../Components/Common/EmptyState";
import Route from "../../Components/Routes/index";

const Fragment = () => {
  const element = useRoutes(routes);
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <main className="min-w-0 flex-1 bg-ig-ground">
      {element || (
        <EmptyState
          title={t("common.pageNotFoundTitle")}
          description={t("common.pageNotFoundDesc")}
          actionLabel={t("LargeNav.home")}
          onAction={() => navigate(Route.default_session)}
        />
      )}
    </main>
  );
};

export default Fragment;
