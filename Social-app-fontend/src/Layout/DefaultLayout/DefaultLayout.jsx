import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import Fragment from "../Fragment/index.jsx";
import LeftNav from "../Sidebar/Left/SidebarLeft.jsx";
import RightNav from "../Sidebar/Right/SidebarRight.jsx";

import ChatPage from "../../Pages/Chat/ChatPage.jsx";
import ChatAI from "../../Components/ChatAI/ChatAI.jsx";

const DefaultLayout = ({ socketData }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { status, suspendedUntil } = useSelector((state) => state.login);
  const isChatPage = location.pathname.includes("/chat");
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
    <div className="relative flex min-h-screen w-full flex-col bg-ig-ground text-ig-text [color-scheme:dark]">
      <div className="fixed inset-y-0 left-0 z-40">
        <LeftNav />
      </div>

      {banner}

      {isChatPage ? (
        <div className="ml-0 min-h-screen flex-1 md:ml-rail">
          <ChatPage socketData={socketData} />
        </div>
      ) : (
        <div className="ml-0 flex min-h-screen flex-1 pb-14 md:ml-rail md:pb-0">
          <Fragment />
          <RightNav />
        </div>
      )}

      {/* Bước 5 sẽ bỏ nút nổi này khi AI chuyển vào khung chat. */}
      <ChatAI />
    </div>
  );
};

export default DefaultLayout;
