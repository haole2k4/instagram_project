import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Bell,
  CircleSlash,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Search,
  Send,
  Shield,
  Star,
  User,
  Video,
} from "lucide-react";

import { handleEditProfile, handleGetById } from "../../Service/UserAPI";
import { userLoginData } from "../../Redux/Reducer/UserAppDeucer";

const SETTINGS_SECTIONS = [
  {
    groupKey: "your_account",
    groupLabelVi: "Tài khoản của bạn",
    groupLabelEn: "Your account",
    items: [
      {
        id: "meta_account",
        icon: Shield,
        titleVi: "Trung tâm tài khoản Meta",
        titleEn: "Meta Account",
        subtitleVi: "Mật khẩu, bảo mật, thông tin cá nhân",
        subtitleEn: "Password, security, personal details, cross-profile experiences",
        isMeta: true,
      },
    ],
  },
  {
    groupKey: "how_you_use",
    groupLabelVi: "Cách bạn dùng Instagram",
    groupLabelEn: "How you use Instagram",
    items: [
      {
        id: "edit_profile",
        icon: User,
        titleVi: "Chỉnh sửa trang cá nhân",
        titleEn: "Edit profile",
      },
      {
        id: "notifications",
        icon: Bell,
        titleVi: "Thông báo",
        titleEn: "Notifications",
      },
    ],
  },
  {
    groupKey: "who_sees_content",
    groupLabelVi: "Ai có thể xem nội dung của bạn",
    groupLabelEn: "Who can see your content",
    items: [
      {
        id: "account_privacy",
        icon: Lock,
        titleVi: "Quyền riêng tư của tài khoản",
        titleEn: "Account privacy",
      },
      {
        id: "close_friends",
        icon: Star,
        titleVi: "Bạn thân",
        titleEn: "Close Friends",
      },
      {
        id: "blocked",
        icon: CircleSlash,
        titleVi: "Đã chặn",
        titleEn: "Blocked",
      },
      {
        id: "story_live",
        icon: Video,
        titleVi: "Tin, phát trực tiếp và vị trí",
        titleEn: "Story, live and location",
      },
    ],
  },
  {
    groupKey: "how_others_interact",
    groupLabelVi: "Cách người khác tương tác với bạn",
    groupLabelEn: "How others can interact with you",
    items: [
      {
        id: "messages_replies",
        icon: Send,
        titleVi: "Tin nhắn và phản hồi tin",
        titleEn: "Messages and story replies",
      },
    ],
  },
];

const Settings = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.login);
  const activeTab = searchParams.get("tab") || "edit_profile";
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Profile Form State
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("male");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security / Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Privacy & Notifications Preferences State
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);
  const [pauseAllNotifs, setPauseAllNotifs] = useState(false);
  const [likesNotif, setLikesNotif] = useState(true);
  const [commentsNotif, setCommentsNotif] = useState(true);
  const [followsNotif, setFollowsNotif] = useState(true);
  const [directNotif, setDirectNotif] = useState(true);

  // Close Friends State
  const [closeFriends, setCloseFriends] = useState(["alex", "jordan", "samantha"]);
  const [closeFriendsSearch, setCloseFriendsSearch] = useState("");

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState(["spambot_99", "annoying_ads"]);

  // Fetch initial profile info
  useEffect(() => {
    if (!userInfo?.id) return;
    const fetchUserData = async () => {
      try {
        const res = await handleGetById(userInfo.id);
        if (res && res.statusCode === 200 && res.data) {
          const user = res.data;
          setNickname(user.userNickname || "");
          setPhone(user.userPhone || "");
          setBio(user.userBio || "");
          setGender(user.userGender === "female" ? "female" : "male");
          if (user.userImage) {
            setAvatarPreview(user.userImage);
          }
        }
      } catch (err) {
        console.error("Error fetching user for settings:", err);
      }
    };
    fetchUserData();
  }, [userInfo?.id]);

  const handleSelectTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userInfo?.id) return;
    setIsSavingProfile(true);
    try {
      const payload = {
        id: userInfo.id,
        userNickname: nickname,
        userPhone: phone,
        userBio: bio,
        userGender: gender,
        userImage: avatarBase64 || avatarPreview,
      };

      const res = await handleEditProfile(payload);
      if (res && (res.statusCode === 200 || res.status === 200)) {
        toast.success(isEn ? "Profile updated successfully!" : "Cập nhật trang cá nhân thành công!");
        dispatch(
          userLoginData({
            user: {
              ...userInfo,
              name: nickname,
              userNickname: nickname,
              avatar: avatarBase64 || avatarPreview,
              userImage: avatarBase64 || avatarPreview,
              userPhone: phone,
              userBio: bio,
              userGender: gender,
            },
          })
        );
      } else {
        toast.error(isEn ? "Failed to update profile." : "Không thể cập nhật trang cá nhân.");
      }
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(isEn ? "Error saving profile." : "Lỗi khi lưu thông tin.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error(isEn ? "Please fill in all password fields." : "Vui lòng nhập đầy đủ mật khẩu.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error(isEn ? "New password must be at least 8 characters." : "Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(isEn ? "Passwords do not match." : "Mật khẩu xác nhận không khớp.");
      return;
    }

    toast.success(isEn ? "Password changed successfully!" : "Đổi mật khẩu thành công!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Lọc mục cài đặt theo search query
  const filteredSections = SETTINGS_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        item.titleVi.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        (item.subtitleVi && item.subtitleVi.toLowerCase().includes(q)) ||
        (item.subtitleEn && item.subtitleEn.toLowerCase().includes(q))
      );
    }),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex min-h-[calc(100vh-56px)] w-full bg-black text-white selection:bg-[#0095f6]/30">
      {/* Cột Danh Mục Cài Đặt (Sidebar phong cách Instagram Web) */}
      <aside className="w-full md:w-[320px] lg:w-[340px] shrink-0 border-r border-[#1a1a1a] bg-black p-4 md:p-6 overflow-y-auto">
        <h1 className="mb-4 text-[22px] md:text-[24px] font-bold text-white tracking-tight">
          {isEn ? "Settings" : "Cài đặt"}
        </h1>

        {/* Ô Tìm Kiếm Trong Cài Đặt */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder={isEn ? "Search" : "Tìm kiếm"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#262626] bg-[#121212] py-2.5 pl-9 pr-4 text-[14px] text-white placeholder-neutral-500 outline-none focus:border-[#0095f6] transition-colors"
          />
        </div>

        {/* Danh Sách Mục Cài Đặt */}
        <nav className="space-y-6">
          {filteredSections.map((section) => (
            <div key={section.groupKey}>
              <h2 className="mb-2 px-3 text-[12px] font-semibold text-[#8e8e8e]">
                {isEn ? section.groupLabelEn : section.groupLabelVi}
              </h2>

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  if (item.isMeta) {
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full text-left rounded-xl p-3 transition-colors ${
                            isActive
                              ? "bg-[#262626] text-white"
                              : "hover:bg-[#121212] text-neutral-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0 text-white">
                              {/* Meta loop icon */}
                              <svg
                                width="20"
                                height="14"
                                viewBox="0 0 24 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <defs>
                                  <linearGradient
                                    id="metaSettingsGrad"
                                    x1="0%"
                                    y1="50%"
                                    x2="100%"
                                    y2="50%"
                                  >
                                    <stop offset="0%" stopColor="#0064e0" />
                                    <stop offset="50%" stopColor="#fa3e3e" />
                                    <stop offset="100%" stopColor="#ff7a00" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M16.65 1.5C14.7 1.5 13.04 2.58 12 4.14C10.96 2.58 9.3 1.5 7.35 1.5C3.84 1.5 1 4.41 1 8C1 11.59 3.84 14.5 7.35 14.5C9.3 14.5 10.96 13.42 12 11.86C13.04 13.42 14.7 14.5 16.65 14.5C20.16 14.5 23 11.59 23 8C23 4.41 20.16 1.5 16.65 1.5ZM7.35 12C5.22 12 3.5 10.21 3.5 8C3.5 5.79 5.22 4 7.35 4C9.28 4 10.66 5.56 11.33 7.02C10.82 8.12 10.02 9.25 9.07 10.33C8.48 11.39 7.9 12 7.35 12ZM16.65 12C16.1 12 15.52 11.39 14.93 10.33C13.98 9.25 13.18 8.12 12.67 7.02C13.34 5.56 14.72 4 16.65 4C18.78 4 20.5 5.79 20.5 8C20.5 10.21 18.78 12 16.65 12Z"
                                  fill="url(#metaSettingsGrad)"
                                />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-white">
                                {isEn ? item.titleEn : item.titleVi}
                              </p>
                              <p className="text-[12px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                                {isEn ? item.subtitleEn : item.subtitleVi}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[14px] font-medium transition-colors ${
                          isActive
                            ? "bg-[#262626] text-white font-semibold"
                            : "text-neutral-300 hover:bg-[#121212] hover:text-white"
                        }`}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                        <span className="truncate">
                          {isEn ? item.titleEn : item.titleVi}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Vùng Hiển Thị Nội Dung Cài Đặt (Right Panel) */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 md:px-12 lg:px-16 max-w-[820px]">
        {/* TAB 1: EDIT PROFILE */}
        {activeTab === "edit_profile" && (
          <div>
            <h2 className="mb-6 text-[22px] font-bold text-white">
              {isEn ? "Edit profile" : "Chỉnh sửa trang cá nhân"}
            </h2>

            {/* Avatar Row */}
            <div className="mb-8 flex items-center justify-between rounded-2xl border border-[#262626] bg-[#121212] p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <img
                  src={avatarPreview || userInfo?.avatar || "/default-avatar.png"}
                  alt={nickname}
                  className="h-16 w-16 rounded-full border border-neutral-700 object-cover"
                />
                <div>
                  <p className="text-[16px] font-semibold text-white">
                    {nickname || userInfo?.name || "User"}
                  </p>
                  <p className="text-[13px] text-neutral-400">
                    {userInfo?.email || ""}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => document.getElementById("settingsAvatarInput")?.click()}
                  className="ig-press rounded-xl bg-[#0095f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1877f2]"
                >
                  {isEn ? "Change photo" : "Đổi ảnh"}
                </button>
                <input
                  id="settingsAvatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Username" : "Tên người dùng"}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 text-[14px] text-white placeholder-neutral-500 outline-none focus:border-[#0095f6] transition-colors"
                />
                <p className="mt-1.5 text-[12px] text-neutral-500">
                  {isEn
                    ? "In most cases, you'll be able to change your username back to another handle within 14 days."
                    : "Tên người dùng của bạn hiển thị trên trang cá nhân và các bài đăng."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Phone number" : "Số điện thoại"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 text-[14px] text-white placeholder-neutral-500 outline-none focus:border-[#0095f6] transition-colors"
                />
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Bio" : "Tiểu sử"}
                </label>
                <textarea
                  rows="3"
                  maxLength={150}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 text-[14px] text-white placeholder-neutral-500 outline-none focus:border-[#0095f6] transition-colors"
                  placeholder={isEn ? "Write something about yourself..." : "Viết một vài dòng về bạn..."}
                />
                <div className="mt-1 flex justify-end text-[12px] text-neutral-500 tabular-nums">
                  {bio.length} / 150
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Gender" : "Giới tính"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`rounded-xl border p-3 text-center text-[14px] font-medium transition-colors ${
                      gender === "male"
                        ? "border-[#0095f6] bg-[#0095f6]/10 text-white font-semibold"
                        : "border-[#262626] bg-[#121212] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {isEn ? "Male" : "Nam"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`rounded-xl border p-3 text-center text-[14px] font-medium transition-colors ${
                      gender === "female"
                        ? "border-[#0095f6] bg-[#0095f6]/10 text-white font-semibold"
                        : "border-[#262626] bg-[#121212] text-neutral-400 hover:text-white"
                    }`}
                  >
                    {isEn ? "Female" : "Nữ"}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="ig-press rounded-xl bg-[#0095f6] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50"
                >
                  {isSavingProfile
                    ? isEn
                      ? "Saving..."
                      : "Đang lưu..."
                    : isEn
                    ? "Submit"
                    : "Gửi"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: META ACCOUNT / PASSWORD & SECURITY */}
        {activeTab === "meta_account" && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {isEn ? "Password and security" : "Mật khẩu và bảo mật"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "Manage your password, login alerts and two-factor authentication."
                : "Quản lý mật khẩu, cảnh báo đăng nhập và bảo mật tài khoản."}
            </p>

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Current password" : "Mật khẩu hiện tại"}
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 pr-11 text-[14px] text-white outline-none focus:border-[#0095f6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "New password" : "Mật khẩu mới"}
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 pr-11 text-[14px] text-white outline-none focus:border-[#0095f6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-white">
                  {isEn ? "Re-type new password" : "Nhập lại mật khẩu mới"}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-3 text-[14px] text-white outline-none focus:border-[#0095f6]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="ig-press rounded-xl bg-[#0095f6] px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-[#1877f2]"
                >
                  {isEn ? "Change password" : "Đổi mật khẩu"}
                </button>
              </div>
            </form>

            <div className="mt-12 rounded-2xl border border-[#262626] bg-[#121212] p-5">
              <div className="flex items-center gap-3 mb-2">
                <KeyRound size={20} className="text-[#00ba38]" />
                <h3 className="text-[16px] font-semibold text-white">
                  {isEn ? "Two-factor authentication" : "Xác thực hai yếu tố"}
                </h3>
              </div>
              <p className="text-[13px] text-neutral-400">
                {isEn
                  ? "Two-factor authentication adds an extra layer of security to your account."
                  : "Bảo vệ tài khoản của bạn bằng mã bảo mật bổ sung mỗi khi đăng nhập."}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {isEn ? "Notifications" : "Thông báo"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "Manage push notifications and email updates."
                : "Tùy chỉnh thông báo đẩy trên ứng dụng."}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {isEn ? "Pause all" : "Tạm dừng tất cả"}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {isEn
                      ? "Temporarily turn off all notifications"
                      : "Tạm thời tắt mọi thông báo"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPauseAllNotifs((prev) => !prev)}
                  className={`h-6 w-11 rounded-full transition-colors relative ${
                    pauseAllNotifs ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      pauseAllNotifs ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {isEn ? "Likes" : "Lượt thích"}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {isEn ? "Notifications when someone likes your post" : "Thông báo khi có người thích bài viết của bạn"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLikesNotif((prev) => !prev)}
                  className={`h-6 w-11 rounded-full transition-colors relative ${
                    likesNotif ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      likesNotif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {isEn ? "Comments" : "Bình luận"}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {isEn ? "Notifications when someone comments on your post" : "Thông báo khi có người bình luận bài viết"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentsNotif((prev) => !prev)}
                  className={`h-6 w-11 rounded-full transition-colors relative ${
                    commentsNotif ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      commentsNotif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {isEn ? "New followers" : "Người theo dõi mới"}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {isEn ? "Notifications when someone follows you" : "Thông báo khi có người bắt đầu theo dõi bạn"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFollowsNotif((prev) => !prev)}
                  className={`h-6 w-11 rounded-full transition-colors relative ${
                    followsNotif ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      followsNotif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-4">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {isEn ? "Direct messages" : "Tin nhắn trực tiếp"}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {isEn ? "Notifications when you receive a message" : "Thông báo khi bạn nhận được tin nhắn"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDirectNotif((prev) => !prev)}
                  className={`h-6 w-11 rounded-full transition-colors relative ${
                    directNotif ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      directNotif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT PRIVACY */}
        {activeTab === "account_privacy" && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {isEn ? "Account privacy" : "Quyền riêng tư của tài khoản"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "Choose who can see your photos and videos."
                : "Chọn người có thể xem ảnh và video của bạn."}
            </p>

            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl border border-[#262626] bg-[#121212] p-5">
                <div className="pr-4">
                  <p className="text-[15px] font-semibold text-white">
                    {isEn ? "Private account" : "Tài khoản riêng tư"}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">
                    {isEn
                      ? "When your account is public, your profile and posts can be seen by anyone. When your account is private, only the followers you approve can see what you share."
                      : "Khi tài khoản ở chế độ công khai, bất kỳ ai cũng có thể xem trang cá nhân và bài viết của bạn. Khi ở chế độ riêng tư, chỉ những người bạn phê duyệt mới xem được."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPrivateAccount((prev) => !prev);
                    toast.success(
                      isEn
                        ? `Account privacy set to ${!isPrivateAccount ? "Private" : "Public"}`
                        : `Đã đổi sang chế độ ${!isPrivateAccount ? "Riêng tư" : "Công khai"}`
                    );
                  }}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors relative mt-1 ${
                    isPrivateAccount ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      isPrivateAccount ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-start justify-between rounded-xl border border-[#262626] bg-[#121212] p-5">
                <div className="pr-4">
                  <p className="text-[15px] font-semibold text-white">
                    {isEn ? "Activity Status" : "Trạng thái hoạt động"}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">
                    {isEn
                      ? "Allow accounts you follow and anyone you message to see when you were last active or are currently active on Instagram apps."
                      : "Cho phép các tài khoản bạn theo dõi và bất kỳ ai bạn nhắn tin biết thời điểm bạn hoạt động lần gần đây nhất."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActivityStatus((prev) => !prev)}
                  className={`h-6 w-11 shrink-0 rounded-full transition-colors relative mt-1 ${
                    activityStatus ? "bg-[#0095f6]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      activityStatus ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CLOSE FRIENDS */}
        {activeTab === "close_friends" && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {isEn ? "Close Friends" : "Bạn thân"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "We don't send notifications when you edit your Close Friends list."
                : "Chúng tôi không gửi thông báo khi bạn chỉnh sửa danh sách bạn thân."}
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder={isEn ? "Search users..." : "Tìm kiếm người dùng..."}
                value={closeFriendsSearch}
                onChange={(e) => setCloseFriendsSearch(e.target.value)}
                className="w-full rounded-xl border border-[#262626] bg-[#121212] px-4 py-2.5 text-[14px] text-white outline-none focus:border-[#0095f6]"
              />
            </div>

            <div className="space-y-2">
              {closeFriends
                .filter((name) =>
                  name.toLowerCase().includes(closeFriendsSearch.toLowerCase())
                )
                .map((friend) => (
                  <div
                    key={friend}
                    className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-[14px] font-bold text-white">
                        {friend[0].toUpperCase()}
                      </div>
                      <span className="text-[14px] font-semibold text-white">
                        @{friend}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00ba38] text-black text-xs font-black">
                        ★
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCloseFriends((prev) => prev.filter((f) => f !== friend));
                          toast.info(`Đã xóa @${friend} khỏi danh sách bạn thân.`);
                        }}
                        className="text-[12px] text-neutral-400 hover:text-white"
                      >
                        {isEn ? "Remove" : "Gỡ"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 6: BLOCKED */}
        {activeTab === "blocked" && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {isEn ? "Blocked accounts" : "Tài khoản đã chặn"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "You can unblock people at any time from this list."
                : "Bạn có thể bỏ chặn bất kỳ ai bất kỳ lúc nào từ danh sách này."}
            </p>

            {blockedUsers.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <CircleSlash size={36} className="mx-auto mb-2 opacity-40" />
                <p>{isEn ? "You haven't blocked anyone." : "Bạn chưa chặn ai."}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map((user) => (
                  <div
                    key={user}
                    className="flex items-center justify-between rounded-xl border border-[#262626] bg-[#121212] p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-[14px] font-bold text-white">
                        {user[0].toUpperCase()}
                      </div>
                      <span className="text-[14px] font-semibold text-white">
                        @{user}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setBlockedUsers((prev) => prev.filter((u) => u !== user));
                        toast.success(
                          isEn
                            ? `Unblocked @${user}`
                            : `Đã bỏ chặn @${user}`
                        );
                      }}
                      className="ig-press rounded-xl border border-neutral-700 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-800"
                    >
                      {isEn ? "Unblock" : "Bỏ chặn"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7 & 8: MESSAGES & STORY REPLIES */}
        {(activeTab === "messages_replies" || activeTab === "story_live") && (
          <div>
            <h2 className="mb-2 text-[22px] font-bold text-white">
              {activeTab === "messages_replies"
                ? isEn
                  ? "Messages and story replies"
                  : "Tin nhắn và phản hồi tin"
                : isEn
                ? "Story, live and location"
                : "Tin, phát trực tiếp và vị trí"}
            </h2>
            <p className="mb-6 text-[14px] text-neutral-400">
              {isEn
                ? "Manage message controls and story interactions."
                : "Quản lý quyền nhận tin nhắn và phản hồi từ mọi người."}
            </p>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#262626] bg-[#121212] p-4">
                <p className="text-[14px] font-semibold text-white mb-2">
                  {isEn ? "Who can send you message requests" : "Ai có thể gửi yêu cầu tin nhắn"}
                </p>
                <div className="space-y-2 text-[13px] text-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="msgReq" defaultChecked className="accent-[#0095f6]" />
                    <span>{isEn ? "Everyone" : "Mọi người"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="msgReq" className="accent-[#0095f6]" />
                    <span>{isEn ? "People you follow" : "Những người bạn theo dõi"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="msgReq" className="accent-[#0095f6]" />
                    <span>{isEn ? "Don't receive requests" : "Không nhận yêu cầu"}</span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#121212] p-4">
                <p className="text-[14px] font-semibold text-white mb-2">
                  {isEn ? "Allow story replies" : "Cho phép phản hồi tin"}
                </p>
                <div className="space-y-2 text-[13px] text-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="storyReplies" defaultChecked className="accent-[#0095f6]" />
                    <span>{isEn ? "Allow replies from everyone" : "Cho phép phản hồi từ mọi người"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="storyReplies" className="accent-[#0095f6]" />
                    <span>{isEn ? "Only people you follow" : "Chỉ những người bạn theo dõi"}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="storyReplies" className="accent-[#0095f6]" />
                    <span>{isEn ? "Off" : "Tắt"}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
