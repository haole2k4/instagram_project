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
import Route from "../../Components/Routes/index";
import SearchPanel from "../../Components/SearchBar/SearchBar";
import NotificationsPanel from "../../Components/Notifications/Notifications";
import CreatePostModal from "../CreateModal/CreatePostModal";
import notificationSocket from "../../Service/NotificationSocket";

const LargeNav = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const { userInfo, accessToken } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const [t] = useTranslation();

  // Khởi tạo WebSocket và lắng nghe sự kiện
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

  const userAvatar = userInfo?.avatar || userInfo?.userImage;

  const navItems = useMemo(
    () => [
      { key: "home", name: t("LargeNav.home"), link: Route.default_session, Icon: Home },
      { key: "search", name: t("LargeNav.search"), action: "search", Icon: Search },
      { key: "messages", name: t("LargeNav.messages"), link: Route.chat, Icon: Send },
      {
        key: "notifications",
        name: t("LargeNav.notifications"),
        action: "notifications",
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
        avatar: userAvatar,
      },
    ],
    [t, hasUnreadNotifications, userAvatar]
  );

  const bottomKeys = ["home", "search", "messages", "profile"];

  const renderItemContent = (item) => (
    <>
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        {item.avatar ? (
          <img
            src={item.avatar}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <item.Icon size={24} strokeWidth={1.5} aria-hidden="true" />
        )}
        {item.hasBadge && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ig-like" />
        )}
      </div>
      <span className="ml-4 hidden overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-inherit group-hover:inline-block">
        {item.name}
      </span>
    </>
  );

  const renderRailItem = (item) => {
    const isSearchOpen = item.action === "search" && openSearch;
    const isNotifOpen = item.action === "notifications" && openNotifications;
    const isExpandedOpen = isSearchOpen || isNotifOpen;

    const baseClass = `relative flex h-12 w-full items-center rounded-xl px-3 text-ig-muted transition-[background-color,color,transform] duration-120 ease-ui-out hover:bg-ig-surface hover:text-ig-text active:scale-[.97] ${
      isExpandedOpen ? "bg-ig-surface text-ig-text" : ""
    }`;

    if (item.action === "search") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            setOpenSearch((prev) => !prev);
            setOpenNotifications(false);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          aria-expanded={openSearch}
          aria-label={item.name}
          title={item.name}
          className={baseClass}
        >
          {renderItemContent(item)}
        </button>
      );
    }

    if (item.action === "notifications") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            setOpenNotifications((prev) => !prev);
            setOpenSearch(false);
            setHasUnreadNotifications(false);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          aria-expanded={openNotifications}
          aria-label={item.name}
          title={item.name}
          className={baseClass}
        >
          {renderItemContent(item)}
        </button>
      );
    }

    if (item.action === "create") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => setShowCreateModal(true)}
          aria-expanded={showCreateModal}
          aria-label={item.name}
          title={item.name}
          className={baseClass}
        >
          {renderItemContent(item)}
        </button>
      );
    }

    return (
      <NavLink
        key={item.key}
        to={item.link}
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
              ? "font-semibold text-ig-text [&_img]:ring-2 [&_img]:ring-ig-text [&_img]:ring-offset-2 [&_img]:ring-offset-ig-ground"
              : ""
          }`
        }
        aria-label={item.name}
        title={item.name}
      >
        {renderItemContent(item)}
      </NavLink>
    );
  };

  const renderBottomItem = (item) => {
    const isSearchOpen = item.action === "search" && openSearch;
    const isNotifOpen = item.action === "notifications" && openNotifications;
    const isExpandedOpen = isSearchOpen || isNotifOpen;

    const baseClass = `nav-icon-btn ${isExpandedOpen ? "text-ig-text" : ""}`;

    const iconContent = (
      <>
        {item.avatar ? (
          <img
            src={item.avatar}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <item.Icon size={24} strokeWidth={1.5} aria-hidden="true" />
        )}
        {item.hasBadge && (
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ig-like" />
        )}
      </>
    );

    if (item.action === "search") {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            setOpenSearch((prev) => !prev);
            setOpenNotifications(false);
          }}
          aria-expanded={openSearch}
          aria-label={item.name}
          title={item.name}
          className={baseClass}
        >
          {iconContent}
        </button>
      );
    }

    return (
      <NavLink
        key={item.key}
        to={item.link}
        aria-label={item.name}
        title={item.name}
        className={baseClass}
      >
        {iconContent}
      </NavLink>
    );
  };

  return (
    <>
      <div className="fixed inset-y-0 left-0 z-40 hidden md:block">
        <div className="group flex h-screen w-rail flex-col border-r border-ig-border bg-ig-ground px-3 py-5 transition-[width] duration-200 ease-ui-out hover:w-[240px] hover:shadow-2xl">
          <Link
            to={Route.default_session}
            aria-label="Instagram"
            title="Instagram"
            className="mb-6 flex h-12 w-full items-center rounded-xl px-3 transition-colors hover:bg-ig-surface/40"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
              <Instagram size={24} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <span className="ml-4 hidden overflow-hidden text-ellipsis whitespace-nowrap text-[18px] font-bold tracking-tight text-ig-text group-hover:inline-block">
              Instagram
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map(renderRailItem)}
          </nav>

          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="relative flex h-12 w-full items-center rounded-xl px-3 text-ig-muted transition-[background-color,color,transform] duration-120 ease-ui-out hover:bg-ig-surface hover:text-ig-text active:scale-[.97]"
              aria-label={t("LargeNav.more")}
              title={t("LargeNav.more")}
              aria-expanded={showMenu}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <span className="ml-4 hidden overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-inherit group-hover:inline-block">
                {t("LargeNav.more")}
              </span>
            </button>

            <MoreMenu
              showMenu={showMenu}
              setShowMenu={setShowMenu}
              positionClassName="bottom-14 left-0 origin-bottom-left"
            />
          </div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-ig-border bg-ig-ground px-4 md:hidden">
        {navItems.filter((item) => bottomKeys.includes(item.key)).map(renderBottomItem)}
      </nav>

      {openSearch && (
        <SearchPanel isOpen={true} onClose={() => setOpenSearch(false)} />
      )}

      {openNotifications && (
        <NotificationsPanel
          isOpen={true}
          onClose={() => setOpenNotifications(false)}
        />
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};

export default LargeNav;
