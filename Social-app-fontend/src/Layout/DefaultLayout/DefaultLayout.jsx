import { useLocation } from "react-router-dom";

import Fragment from "../Fragment/index.jsx";
import LeftNav from "../Sidebar/Left/SidebarLeft.jsx";
import RightNav from "../Sidebar/Right/SidebarRight.jsx";

import ChatPage from "../../Pages/Chat/ChatPage.jsx";
import ChatAI from "../../Components/ChatAI/ChatAI.jsx";

const DefaultLayout = ({ socketData }) => {
  const location = useLocation();
  const isChatPage = location.pathname.includes("/chat");

  return (
    <div className="relative flex min-h-screen w-full bg-ig-ground">
      <div className="fixed inset-y-0 left-0 z-40">
        <LeftNav />
      </div>

      {isChatPage ? (
        <div className="ml-0 min-h-screen flex-1 pb-14 md:ml-rail md:pb-0">
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
