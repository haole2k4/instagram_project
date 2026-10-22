import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import {
  Heart,
  Home,
  Instagram,
  Menu,
  PlusSquare,
  Search,
  Send,
  User,
} from "lucide-react";

import MoreMenu from "./MoreMenu/MoreMenu";
import MenuFormGenerate from "./FormGenerate/FormGenerate";
import Route from "../../Components/Routes/index";
import SearchPanel from "../../Components/SearchBar/SearchBar";
import notificationSocket from "../../Service/NotificationSocket";

const LargeNav = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const { userInfo, accessToken } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const [t] = useTranslation();

  // Khởi tạo WebSocket và lắng nghe sự kiện like_update và comment_update
  useEffect(() => {
    if (!userInfo?.id) return;

    notificationSocket.init(dispatch, userInfo.id, accessToken);

    const unsubscribeNotifications =
      notificationSocket.subscribeToNotifications((notificationData) => {
        if (notificationData.userId === userInfo.id) {
          setHasUnreadNotifications(true);
        }
      });

    const unsubscribeLikes = notificationSocket.subscribeToLikeUpdates(() => {
      setHasUnreadNotifications(true);
    });

    const unsubscribeComments = notificationSocket.subscribeToCommentUpdates(
      (commentData) => {
        if (commentData.userId !== userInfo.id) {
          setHasUnreadNotifications(true);
        }
      }
    );

    const unsubscribeFollow = notificationSocket.subscribeToFollow(() => {
      setHasUnreadNotifications(true);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeLikes();
      unsubscribeComments();
      unsubscribeFollow();
    };
  }, [userInfo?.id, accessToken, dispatch]);

  const navItems = useMemo(
    () => [
      { key: "home", name: t("LargeNav.home"), link: Route.default_session, Icon: Home },
      { key: "search", name: t("LargeNav.search"), action: "search", Icon: Search },
      { key: "messages", name: t("LargeNav.messages"), link: Route.chat, Icon: Send },
      {
        key: "notifications",
        name: t("LargeNav.notifications"),
        link: Route.notification,
        Icon: Heart,
        hasBadge: hasUnreadNotifications,
      },
      { key: "create", name: t("LargeNav.create"), action: "create", Icon: PlusSquare },
      {
        key: "profile",
        name: t("LargeNav.profile"),
        link: Route.profile,
        Icon: User,
        avatar: userInfo?.userImage,
      },
    ],
    [t, hasUnreadNotifications, userInfo?.userImage]
  );

  const bottomKeys = ["home", "search", "messages", "profile"];

  const renderIcon = ({ Icon, avatar, hasBadge }) => (
    <>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      ) : (
        <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
      )}
      {hasBadge && (
        <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ig-like" />
      )}
    </>
  );

  const renderItem = (item) => {
    const content = renderIcon(item);
    const props = {
      className: "nav-icon-btn",
      "aria-label": item.name,
      title: item.name,
    };

    if (item.action === "search") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => setOpenSearch((prev) => !prev)}
          onMouseDown={(event) => event.stopPropagation()}
          aria-expanded={openSearch}
          {...props}
        >
          {content}
        </button>
      );
    }

    if (item.action === "create") {
      return (
        <div key={item.key} className="relative">
          <button
            type="button"
            onClick={() => setShowCreateModal((prev) => !prev)}
            aria-expanded={showCreateModal}
            {...props}
          >
            {content}
          </button>
          <MenuFormGenerate
            showCreateModal={showCreateModal}
            setShowCreateModal={setShowCreateModal}
          />
        </div>
      );
    }

    return (
      <NavLink
        key={item.key}
        to={item.link}
        onClick={
          item.key === "notifications"
            ? () => setHasUnreadNotifications(false)
            : undefined
        }
        {...props}
      >
        {content}
      </NavLink>
    );
  };

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden md:block">
        <div className="flex h-screen w-rail flex-col items-center border-r border-ig-border bg-ig-ground py-5">
          <Link
            to={Route.default_session}
            aria-label="Instagram"
            title="Instagram"
            className="mb-4 flex h-12 w-12 items-center justify-center"
          >
            <Instagram size={24} strokeWidth={1.5} aria-hidden="true" />
          </Link>

          <nav className="flex flex-1 flex-col items-center gap-1">
            {navItems.map(renderItem)}
          </nav>

          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="nav-icon-btn"
            aria-label={t("LargeNav.more")}
            title={t("LargeNav.more")}
            aria-expanded={showMenu}
          >
            <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>

          <MoreMenu showMenu={showMenu} setShowMenu={setShowMenu} />
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-ig-border bg-ig-ground px-4 md:hidden">
        {navItems.filter((item) => bottomKeys.includes(item.key)).map(renderItem)}
      </nav>

      {openSearch && (
        <SearchPanel isOpen={true} onClose={() => setOpenSearch(false)} />
      )}
    </>
  );
};

export default LargeNav;
