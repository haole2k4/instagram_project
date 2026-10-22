import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Language from "./Language/Language";
import { useTranslation } from "react-i18next";
import { UserLogOut } from "../../../Service/AuthApi";
import { userLogoutALL } from "../../../Redux/Reducer/UserAppDeucer";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import instance from "../../../Utils/AxiosApi/Axios";
import webSocketService from "../../../Service/WebSocketService";

const MoreMenu = (props) => {
  const { showMenu, setShowMenu } = props;
  let navi = useNavigate();
  let dispatch = useDispatch();
  const [t] = useTranslation();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  let lang = useSelector((state) => state.app.language);
  useEffect(() => {
    setShowMenu(false);
  }, [lang]);
  const handleLogOut = async () => {
    try {
      let res = await UserLogOut();
      if (res && res.statusCode === 200) {
        toast.success("Đăng xuất thành công!");
        webSocketService.disconnect();
        await dispatch(userLogoutALL());
        instance.defaults.headers.common = {};
      } else {
        toast.error("Đăng xuất thất bại, vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      toast.error("Có lỗi xảy ra khi đăng xuất.");
    }
  };

  return (
    <div className="relative">
      {showMenu && (
        <div className="absolute bottom-14 left-0 z-50 w-56 rounded-panel border border-ig-border bg-ig-raised p-2 shadow-lg">
          <ul className="text-sm text-ig-text">
            <li className="cursor-pointer rounded-lg p-2 hover:bg-ig-surface">
              {t("menu.setting")}
            </li>
            <Language />
            <li className="cursor-pointer rounded-lg p-2 hover:bg-ig-surface">
              {t("moreMenu.activity")}
            </li>
            <hr className="my-2 border-ig-border" />
          </ul>
          <button
            onClick={handleLogOut}
            className="w-full rounded-lg p-2 text-left text-ig-like hover:bg-ig-surface"
          >
            {t("moreMenu.logout")}
          </button>
        </div>
      )}
    </div>
  );
};

export default MoreMenu;
