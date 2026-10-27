import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import Fragment from "../Fragment/index.jsx";
import LeftNav from "../Sidebar/Left/SidebarLeft.jsx";
import RightNav from "../Sidebar/Right/SidebarRight.jsx";
import ChatPage from "../../Pages/Chat/ChatPage.jsx";
import MiniChatFloating from "../../Components/Messenger/MiniChatFloating.jsx";
import Route from "../../Components/Routes/index";

const DefaultLayout = ({ socketData }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { status, suspendedUntil } = useSelector((state) => state.login);
  const isChatPage = location.pathname.includes("/chat");
  const isHomePage = location.pathname === Route.default_session;
  const restricted = status === "SUSPENDED" || status === "BANNED";
  const until = suspendedUntil
    ? new Date(suspendedUntil).toLocaleString("vi-VN")
    : "";

  const banner = restricted ? (
    <div className="ml-0 border-b border-ig-raised bg-ig-surface px-4 py-2 text-[13px] text-ig-muted md:ml-rail">
      {status === "BANNED"
        ? t("restricted.banned")
        : t("restricted.suspended", { until })}
    </div>
  ) : null;

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-ig-ground text-ig-text [color-scheme:dark]">
      <div className="fixed inset-y-0 left-0 z-40">
        <LeftNav />
      </div>

      {banner}

      {isChatPage ? (
        <div className="ml-0 min-h-dvh flex-1 md:ml-rail">
          <ChatPage socketData={socketData} />
        </div>
      ) : (
        <div className="ml-0 flex min-h-dvh flex-1 justify-center px-4 pb-16 pt-4 md:ml-rail md:px-6 md:pb-8 md:pt-6">
          <div
            className={`flex w-full justify-center ${
              isHomePage ? "max-w-[982px] gap-8" : "max-w-[935px]"
            }`}
          >
            <Fragment />
            {isHomePage && <RightNav />}
          </div>
        </div>
      )}

      {!isChatPage && <MiniChatFloating />}
    </div>
  );
};

export default DefaultLayout;
