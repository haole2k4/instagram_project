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
    <div className="ml-[270px] border-b border-[#2a2a2a] bg-[#111] px-4 py-2 text-[13px] text-[#b4b4b4]">
      {status === "BANNED"
        ? t("restricted.banned")
        : t("restricted.suspended", { until })}
    </div>
  ) : null;

  return (
    <div className="flex w-full flex-col bg-black relative">
      {banner}
      <div className="flex w-full flex-col">
        <div className="fixed">
          <LeftNav />
        </div>

        {isChatPage ? (
          <div className="flex-1 min-h-screen bg-black ml-[270px]">
            <div className="h-full w-full">
              <ChatPage socketData={socketData} />
            </div>
          </div>
        ) : (
          <div className="flex w-full min-h-screen bg-black ml-[270px]">
            <Fragment />
            <RightNav />
          </div>
        )}
      </div>
      <ChatAI />
    </div>
  );
};

export default DefaultLayout;
