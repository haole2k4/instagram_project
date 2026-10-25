import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import AuthSplashScreen from "../../Components/Common/AuthSplashScreen";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  Users,
  X,
} from "lucide-react";
import { UserLogOut } from "../../Service/AuthApi";
import { userLogoutALL } from "../../Redux/Reducer/UserAppDeucer";

const NAV = [
  { to: "/admin", end: true, label: "dashboard", icon: LayoutDashboard },
  { to: "/admin/reports", label: "reports", icon: Flag },
  { to: "/admin/users", label: "users", icon: Users },
  { to: "/admin/content", label: "content", icon: FileText },
  {
    to: "/admin/audit-logs",
    label: "audit",
    icon: ScrollText,
    adminOnly: true,
  },
];

const TITLES = {
  "/admin": "dashboard",
  "/admin/reports": "reports",
  "/admin/users": "users",
  "/admin/content": "content",
  "/admin/audit-logs": "audit",
};

const AdminLayout = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { roles, userInfo } = useSelector((state) => state.login);
  const isAdmin = roles?.includes("ADMIN");
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored !== null) return stored === "true";
    return window.innerWidth < 1200;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const items = useMemo(
    () => NAV.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const titleKey =
    Object.entries(TITLES)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) =>
        path === "/admin"
          ? location.pathname === "/admin"
          : location.pathname.startsWith(path)
      )?.[1] || "dashboard";

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await UserLogOut();
    } catch {
      // Cookie/token cleanup on the client still applies.
    }
    dispatch(userLogoutALL());
    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 850);
  };

  const nav = (mobile = false) => (
    <nav aria-label={t("admin.navigation")} className="p-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={t(`admin.${item.label}`)}
            className={({ isActive }) =>
              [
                "mb-1 flex h-10 items-center rounded-[4px] text-[14px] transition-colors duration-150",
                collapsed && !mobile ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-[#161616] text-white"
                  : "text-[#b4b4b4] hover:bg-[#111] hover:text-white",
              ].join(" ")
            }
          >
            <Icon size={18} aria-hidden="true" />
            {collapsed && !mobile ? (
              <span className="sr-only">{t(`admin.${item.label}`)}</span>
            ) : (
              <span>{t(`admin.${item.label}`)}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const brand = (mobile = false) => (
    <div
      className={[
        "flex h-14 items-center border-b border-[#161616]",
        collapsed && !mobile ? "justify-center px-0" : "gap-3 px-4",
      ].join(" ")}
    >
      <Shield size={20} className="shrink-0 text-white" aria-hidden="true" />
      {collapsed && !mobile ? (
        <span className="sr-only">{t("admin.brand")}</span>
      ) : (
        <span className="truncate text-[14px] font-semibold text-white">
          {t("admin.brand")}
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <AuthSplashScreen isVisible={isLoggingOut} />
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#161616] bg-black md:flex",
          collapsed ? "w-16" : "w-60",
        ].join(" ")}
      >
        {brand()}
        <div className="flex-1 overflow-y-auto">{nav()}</div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className={[
            "flex h-12 items-center border-t border-[#161616] text-[#b4b4b4] hover:text-white",
            collapsed ? "justify-center" : "gap-2 px-4",
          ].join(" ")}
          aria-label={
            collapsed ? t("admin.expandSidebar") : t("admin.collapseSidebar")
          }
          title={
            collapsed ? t("admin.expandSidebar") : t("admin.collapseSidebar")
          }
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed ? (
            <span className="text-[12px]">{t("admin.collapseSidebar")}</span>
          ) : null}
        </button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label={t("admin.closeMenu")}
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] flex-col border-r border-[#161616] bg-black">
            <div className="flex items-center justify-between border-b border-[#161616]">
              {brand(true)}
              <button
                type="button"
                className="mr-3 p-2 text-[#b4b4b4] hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label={t("admin.closeMenu")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav(true)}</div>
          </aside>
        </div>
      ) : null}

      <div
        className={[
          "min-h-screen",
          collapsed ? "md:pl-16" : "md:pl-60",
        ].join(" ")}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[#161616] bg-black px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="p-2 text-[#b4b4b4] hover:text-white md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t("admin.openMenu")}
            >
              <Menu size={18} />
            </button>
            <div className="truncate text-[14px] text-[#b4b4b4]">
              <span>{t("admin.brand")}</span>
              <span className="mx-2 text-[#2a2a2a]">/</span>
              <span className="text-white">{t(`admin.${titleKey}`)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-[#b4b4b4] sm:inline">
              {userInfo?.nikName || userInfo?.name || ""}
            </span>
            <span className="border border-[#2a2a2a] px-2 py-1 text-[11px] text-[#b4b4b4]">
              {roles?.includes("ADMIN") ? "ADMIN" : "MODERATOR"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-[#b4b4b4] hover:text-white"
              aria-label={t("admin.logout")}
              title={t("admin.logout")}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
