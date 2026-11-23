import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  Check,
  ChevronDown,
  Globe,
  Lock,
  Search,
  Shield,
  User,
} from "lucide-react";

import {
  getPrivacySettings,
  handleEditProfile,
  handleGetById,
  updatePrivacySettings,
} from "../../Service/userApi";
import { userLoginData } from "../../Redux/Reducer/UserAppDeucer";
import { changeLanguageRedux } from "../../Redux/Reducer/appReducer";

const SETTINGS_ITEMS = [
  { id: "edit_profile", icon: User, labelKey: "settings.tabs.editProfile" },
  { id: "privacy", icon: Lock, labelKey: "settings.tabs.privacy" },
  { id: "language", icon: Globe, labelKey: "settings.tabs.language" },
  { id: "account_status", icon: Shield, labelKey: "settings.tabs.accountStatus" },
];

const Settings = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "vi";
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();

  const { userInfo, accessToken, roles, status, suspendedUntil } = useSelector(
    (state) => state.login
  );
  const rawTab = searchParams.get("tab") || "edit_profile";
  const activeTab = rawTab === "messages_replies" ? "privacy" : rawTab;
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Profile State
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("male");
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const objectUrlRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Privacy State (/user/privacy-settings)
  const [allowStrangerMessages, setAllowStrangerMessages] = useState(true);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "privacy") return;
    getPrivacySettings()
      .then((res) => {
        if (res?.data?.allowStrangerMessages !== undefined) {
          setAllowStrangerMessages(res.data.allowStrangerMessages);
        }
      })
      .catch((err) => console.error("Error fetching privacy settings:", err));
  }, [activeTab]);

  useEffect(() => {
    if (!userInfo?.id) return;
    const fetchUserData = async () => {
      try {
        const res = await handleGetById(userInfo.id);
        if (res && res.statusCode === 200 && res.data) {
          const user = res.data;
          setNickname(user.userNickname || "");
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

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    dispatch(changeLanguageRedux(lang));
    toast.success(
      lang === "vi"
        ? t("settings.languageSwitchedVi")
        : t("settings.languageSwitchedEn")
    );
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setAvatarPreview(nextUrl);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userInfo?.id) return;
    setIsSavingProfile(true);
    try {
      const nextImage = avatarBase64 || avatarPreview;
      const payload = {
        id: userInfo.id,
        userNickname: nickname,
        userBio: bio,
        userGender: gender,
        userImage: nextImage,
      };

      const res = await handleEditProfile(payload);
      if (res && (res.statusCode === 200 || res.status === 200)) {
        toast.success(t("settings.profileUpdated"));
        dispatch(
          userLoginData({
            user: {
              ...userInfo,
              name: nickname,
              userNickname: nickname,
              avatar: nextImage,
              userImage: nextImage,
              userBio: bio,
              userGender: gender,
            },
            accessToken,
            roles,
            status,
            suspendedUntil,
          })
        );
      } else {
        toast.error(t("settings.profileUpdateError"));
      }
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(t("settings.profileSaveError"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePrivacySettingChange = async (allow) => {
    setAllowStrangerMessages(allow);
    setLoadingPrivacy(true);
    try {
      await updatePrivacySettings({ allowStrangerMessages: allow });
      toast.success(
        allow
          ? t("settings.strangerMessagesAllowed")
          : t("settings.strangerMessagesBlocked")
      );
    } catch (err) {
      console.error("Error updating privacy settings:", err);
      toast.error(t("settings.privacyUpdateError"));
      setAllowStrangerMessages(!allow);
    } finally {
      setLoadingPrivacy(false);
    }
  };

  const filteredItems = SETTINGS_ITEMS.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return t(item.labelKey).toLowerCase().includes(q);
  });

  const locale = currentLang.startsWith("en") ? "en-US" : "vi-VN";
  const formattedSuspendedUntil = suspendedUntil
    ? new Date(suspendedUntil).toLocaleString(locale)
    : "";

  return (
    <div className="flex min-h-[calc(100vh-56px)] w-full flex-col bg-ig-ground text-ig-text md:flex-row">
      <aside className="no-scrollbar w-full shrink-0 border-b border-ig-border bg-ig-ground p-4 md:w-[300px] md:border-b-0 md:border-r md:p-6">
        <h1 className="mb-5 text-[24px] font-semibold tracking-tight text-ig-text">
          {t("settings.title")}
        </h1>

        <div className="relative mb-5">
          <Search
            size={16}
            strokeWidth={1.5}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ig-faint"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={t("settings.searchPlaceholder")}
            aria-label={t("settings.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-ig-border bg-ig-surface py-2.5 pl-9 pr-4 text-[14px] text-ig-text placeholder-ig-faint outline-none transition-colors focus:border-ig-accent"
          />
        </div>

        <nav aria-label={t("settings.title")}>
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[14px] transition-colors ${
                      isActive
                        ? "bg-ig-raised font-semibold text-ig-text"
                        : "text-ig-muted hover:bg-ig-surface hover:text-ig-text"
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="no-scrollbar max-w-[720px] flex-1 overflow-y-auto px-4 py-6 sm:px-8 md:px-12">
        {activeTab === "edit_profile" && (
          <div>
            <h2 className="mb-6 text-[20px] font-semibold tracking-tight text-ig-text">
              {t("settings.tabs.editProfile")}
            </h2>

            <div className="mb-6 flex items-center justify-between rounded-panel border border-ig-border bg-ig-surface p-4">
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src={avatarPreview || userInfo?.avatar || "/default-avatar.png"}
                  alt={nickname || userInfo?.userNickname || ""}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/default-avatar.png";
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-ig-text">
                    {nickname || userInfo?.userNickname || "—"}
                  </p>
                  <p className="truncate text-[14px] text-ig-muted">
                    {userInfo?.name || userInfo?.userFullname || ""}
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="ig-press rounded-lg bg-ig-accent px-4 py-1.5 text-[14px] font-semibold text-white hover:opacity-90"
                >
                  {t("settings.changePhoto")}
                </button>
                <input
                  ref={avatarInputRef}
                  id="settingsAvatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label
                  htmlFor="settings-nickname"
                  className="mb-2 block text-[14px] font-semibold text-ig-text"
                >
                  {t("settings.nicknameLabel")}
                </label>
                <input
                  id="settings-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-ig-border bg-ig-surface px-4 py-3 text-[14px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-bio"
                  className="mb-2 block text-[14px] font-semibold text-ig-text"
                >
                  {t("settings.bioLabel")}
                </label>
                <div className="relative rounded-xl border border-ig-border bg-ig-surface p-4">
                  <textarea
                    id="settings-bio"
                    rows={3}
                    maxLength={150}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t("settings.bioPlaceholder")}
                    className="w-full resize-none bg-transparent text-[14px] text-ig-text placeholder-ig-faint outline-none"
                  />
                  <div className="flex justify-end text-[12px] text-ig-faint tabular-nums">
                    {bio.length} / 150
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[14px] font-semibold text-ig-text">
                  {t("settings.genderLabel")}
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGenderDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl border border-ig-border bg-ig-surface px-4 py-3 text-left text-[14px] text-ig-text transition-colors hover:border-ig-faint"
                  >
                    <span>
                      {gender === "male"
                        ? t("settings.genderMale")
                        : t("settings.genderFemale")}
                    </span>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.5}
                      className={`text-ig-muted transition-transform ${
                        isGenderDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isGenderDropdownOpen && (
                    <div className="absolute left-0 right-0 top-12 z-20 mt-1 rounded-xl border border-ig-border bg-ig-raised p-1.5 shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setGender("male");
                          setIsGenderDropdownOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[14px] transition hover:bg-ig-surface ${
                          gender === "male"
                            ? "font-semibold text-ig-accent"
                            : "text-ig-text"
                        }`}
                      >
                        {t("settings.genderMale")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGender("female");
                          setIsGenderDropdownOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-[14px] transition hover:bg-ig-surface ${
                          gender === "female"
                            ? "font-semibold text-ig-accent"
                            : "text-ig-text"
                        }`}
                      >
                        {t("settings.genderFemale")}
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-ig-faint">
                  {t("settings.genderHint")}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="ig-press rounded-lg bg-ig-accent px-6 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isSavingProfile
                    ? t("settings.saving")
                    : t("settings.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "privacy" && (
          <div>
            <h2 className="mb-2 text-[20px] font-semibold tracking-tight text-ig-text">
              {t("settings.tabs.privacy")}
            </h2>
            <p className="mb-6 text-[14px] text-ig-muted">
              {t("settings.privacyDescription")}
            </p>

            <div className="rounded-xl border border-ig-border bg-ig-surface p-4">
              <p className="mb-3 text-[14px] font-semibold text-ig-text">
                {t("settings.whoCanMessageTitle")}
              </p>
              <div className="space-y-3 text-[13px] text-ig-muted">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="msgReq"
                    checked={allowStrangerMessages}
                    onChange={() => handlePrivacySettingChange(true)}
                    disabled={loadingPrivacy}
                    className="mt-0.5 accent-[#0095f6]"
                  />
                  <div>
                    <span className="font-medium text-ig-text">
                      {t("settings.everyone")}
                    </span>
                    <p className="text-[12px] text-ig-faint">
                      {t("settings.everyoneDesc")}
                    </p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="msgReq"
                    checked={!allowStrangerMessages}
                    onChange={() => handlePrivacySettingChange(false)}
                    disabled={loadingPrivacy}
                    className="mt-0.5 accent-[#0095f6]"
                  />
                  <div>
                    <span className="font-medium text-ig-text">
                      {t("settings.followingOnly")}
                    </span>
                    <p className="text-[12px] text-ig-faint">
                      {t("settings.followingOnlyDesc")}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "language" && (
          <div>
            <h2 className="mb-2 text-[20px] font-semibold tracking-tight text-ig-text">
              {t("settings.languageTitle")}
            </h2>
            <p className="mb-6 text-[14px] text-ig-muted">
              {t("settings.languageDescription")}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                  currentLang.startsWith("vi")
                    ? "border-ig-accent bg-ig-accent/10 text-ig-text"
                    : "border-ig-border bg-ig-surface text-ig-muted hover:border-ig-faint"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe size={20} strokeWidth={1.5} className="text-ig-text" aria-hidden="true" />
                  <div>
                    <p className="text-[14px] font-semibold text-ig-text">
                      Tiếng Việt
                    </p>
                    <p className="text-[12px] text-ig-faint">
                      {t("settings.defaultLanguage")}
                    </p>
                  </div>
                </div>
                {currentLang.startsWith("vi") && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ig-accent text-white">
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                  currentLang.startsWith("en")
                    ? "border-ig-accent bg-ig-accent/10 text-ig-text"
                    : "border-ig-border bg-ig-surface text-ig-muted hover:border-ig-faint"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe size={20} strokeWidth={1.5} className="text-ig-text" aria-hidden="true" />
                  <div>
                    <p className="text-[14px] font-semibold text-ig-text">
                      English
                    </p>
                    <p className="text-[12px] text-ig-faint">
                      {t("settings.englishSubtitle")}
                    </p>
                  </div>
                </div>
                {currentLang.startsWith("en") && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ig-accent text-white">
                    <Check size={14} strokeWidth={2} aria-hidden="true" />
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "account_status" && (
          <div>
            <h2 className="mb-2 text-[20px] font-semibold tracking-tight text-ig-text">
              {t("settings.tabs.accountStatus")}
            </h2>
            <p className="mb-6 text-[14px] text-ig-muted">
              {t("settings.accountStatusDescription")}
            </p>

            <div className="space-y-4 rounded-xl border border-ig-border bg-ig-surface p-5">
              <div className="flex items-center justify-between gap-4 border-b border-ig-rule pb-4">
                <span className="text-[14px] text-ig-muted">
                  {t("settings.statusLabel")}
                </span>
                <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-ig-text">
                  <span
                    aria-hidden="true"
                    className={`h-[6px] w-[6px] rounded-full ${
                      status === "BANNED"
                        ? "bg-ig-like"
                        : status === "SUSPENDED"
                          ? "border border-ig-muted bg-transparent"
                          : "bg-ig-text"
                    }`}
                  />
                  {status || "ACTIVE"}
                </span>
              </div>

              {status === "SUSPENDED" && formattedSuspendedUntil ? (
                <div className="flex items-center justify-between gap-4 border-b border-ig-rule pb-4">
                  <span className="text-[14px] text-ig-muted">
                    {t("settings.suspendedUntilLabel")}
                  </span>
                  <span className="text-[14px] tabular-nums text-ig-text">
                    {formattedSuspendedUntil}
                  </span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] text-ig-muted">
                  {t("settings.rolesLabel")}
                </span>
                <span className="text-[13px] text-ig-text">
                  {Array.isArray(roles) && roles.length ? roles.join(" · ") : "USER"}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
