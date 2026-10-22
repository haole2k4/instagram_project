import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import {
  Compass,
  Heart,
  Home,
  Menu,
  PlusSquare,
  Search,
  Send,
  User,
} from "lucide-react";

import InstagramIcon from "../../assets/logo/icon.png";
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
        if (commentData.userId != userInfo.id) {
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
      { name: t("LargeNav.home"), link: Route.default_session, Icon: Home },
      { name: t("LargeNav.search"), action: "search", Icon: Search },
      { name: t("LargeNav.messages"), link: Route.chat, Icon: Send },
      {
        name: t("LargeNav.notifications"),
        link: Route.notification,
        Icon: Heart,
        hasBadge: hasUnreadNotifications,
      },
      { name: t("LargeNav.create"), action: "create", Icon: PlusSquare },
      {
        name: t("LargeNav.profile"),
        link: Route.profile,
        Icon: User,
        avatar: userInfo?.userImage,
      },
      { name: t("LargeNav.explore"), link: Route.search, Icon: Compass },
    ],
    [t, hasUnreadNotifications, userInfo?.userImage]
  );

  const handleNotificationsClick = () => setHasUnreadNotifications(false);

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

  return (
    <>
      <div className="flex h-screen w-[72px] flex-col items-center border-r border-ig-border bg-ig-ground py-5">
        <Link
          to={Route.default_session}
          aria-label="Instagram"
          className="mb-4 flex h-12 w-12 items-center justify-center"
        >
          <img src={InstagramIcon} alt="" className="h-7 w-7" />
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {navItems.map((item) => {
            if (item.action === "search") {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setOpenSearch((prev) => !prev)}
                  className="nav-icon-btn"
                  aria-label={item.name}
                  title={item.name}
                  aria-expanded={openSearch}
                >
                  {renderIcon(item)}
                </button>
              );
            }

            if (item.action === "create") {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setShowCreateModal((prev) => !prev)}
                  className="nav-icon-btn"
                  aria-label={item.name}
                  title={item.name}
                >
                  {renderIcon(item)}
                </button>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.link}
                onClick={
                  item.name === t("LargeNav.notifications")
                    ? handleNotificationsClick
                    : undefined
                }
                className="nav-icon-btn"
                aria-label={item.name}
                title={item.name}
              >
                {renderIcon(item)}
              </NavLink>
            );
          })}
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
        <MenuFormGenerate
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
        />
      </div>

      {openSearch && (
        <SearchPanel isOpen={true} onClose={() => setOpenSearch(false)} />
      )}
    </>
  );
};

export default LargeNav;
