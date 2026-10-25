import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserLogOut } from "../../../Service/AuthApi";
import { userLogoutALL } from "../../../Redux/Reducer/UserAppDeucer";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import instance from "../../../Utils/AxiosApi/Axios";
import webSocketService from "../../../Service/WebSocketService";
import AuthSplashScreen from "../../Common/AuthSplashScreen";

const MoreMenu = ({
  showMenu,
  setShowMenu,
  positionClassName = "fixed bottom-20 left-[84px] origin-bottom-left",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
      setIsLoggingOut(true);
      await UserLogOut();
      webSocketService.disconnect();
      await dispatch(userLogoutALL());
      instance.defaults.headers.common = {};
      setTimeout(() => {
        navigate("/login");
      }, 850);
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      toast.error(t("sidebar.logoutError"));
    }
  };

  return (
    <>
      <AuthSplashScreen isVisible={isLoggingOut} />
      {showMenu && (
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
                    to="/user/settings"
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
  )}
</>
  );
};

export default MoreMenu;
