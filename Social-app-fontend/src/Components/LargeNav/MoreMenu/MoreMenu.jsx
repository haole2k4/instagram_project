import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Language from "./Language/Language";
import { useTranslation } from "react-i18next";
import { UserLogOut } from "../../../Service/AuthApi";
import { userLogoutALL } from "../../../Redux/Reducer/UserAppDeucer";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import instance from "../../../Utils/AxiosApi/Axios";
import webSocketService from "../../../Service/WebSocketService";
import Route from "../../../Components/Routes/index";

const MoreMenu = ({
  showMenu,
  setShowMenu,
  positionClassName = "fixed bottom-20 left-[84px] origin-bottom-left",
}) => {
  const dispatch = useDispatch();
  const [t] = useTranslation();
  const lang = useSelector((state) => state.app.language);
  const { userInfo, roles = [] } = useSelector((state) => state.login);
  const menuRef = useRef(null);

  const isStaff =
    Array.isArray(roles) &&
    (roles.includes("ADMIN") ||
      roles.includes("ROLE_ADMIN") ||
      roles.includes("MODERATOR") ||
      roles.includes("ROLE_MODERATOR"));

  useEffect(() => {
    setShowMenu(false);
  }, [lang, setShowMenu]);

  useEffect(() => {
    if (!showMenu) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, setShowMenu]);

  const handleLogOut = async () => {
    try {
      const res = await UserLogOut();
      if (res && res.statusCode === 200) {
        toast.success(t("sidebar.logoutSuccess"));
        webSocketService.disconnect();
        await dispatch(userLogoutALL());
        instance.defaults.headers.common = {};
      } else {
        toast.error(t("sidebar.logoutFailed"));
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t("sidebar.logoutError"));
    }
  };

  if (!showMenu) return null;

  return (
    <div ref={menuRef} className="relative">
      <div
        role="menu"
        aria-label={t("LargeNav.more")}
        className={`nav-popover ${positionClassName}`}
      >
        <ul className="text-[14px] text-ig-text">
          {userInfo?.id && (
            <li>
              <Link
                to={`${Route.edit_profile}/${userInfo.id}`}
                onClick={() => setShowMenu(false)}
                className="block rounded-lg p-2 hover:bg-ig-surface"
              >
                {t("menu.setting")}
              </Link>
            </li>
          )}
          {isStaff && (
            <li>
              <Link
                to="/admin"
                onClick={() => setShowMenu(false)}
                className="block rounded-lg p-2 hover:bg-ig-surface"
              >
                {t("moreMenu.admin")}
              </Link>
            </li>
          )}
          <li>
            <Language dark />
          </li>
          <li aria-hidden="true">
            <hr className="my-2 border-ig-border" />
          </li>
        </ul>
        <button
          type="button"
          onClick={handleLogOut}
          className="w-full rounded-lg p-2 text-left text-[14px] text-ig-like hover:bg-ig-surface"
        >
          {t("moreMenu.logout")}
        </button>
      </div>
    </div>
  );
};

export default MoreMenu;
