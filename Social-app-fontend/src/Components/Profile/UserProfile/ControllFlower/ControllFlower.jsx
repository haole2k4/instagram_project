import React, { useEffect, useState } from "react";
import { handleGetAllFollower } from "../../../../Service/Folower";
import { useSelector } from "react-redux";
import { handlePostFollower } from "../../../../Service/UserAPI";
import { useWebSocket } from "../../../../Utils/configCallVideo/websocket";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export default function ControllFollower({
  isOpen,
  onClose,
  id,
  fetchDataUser,
}) {
  const [dataFollower, setDataFollower] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const currentUser = useSelector((state) => state.login?.userInfo);
  const { sendFollowNotification } = useWebSocket();
  const { t } = useTranslation();

  useEffect(() => {
    const fectDataFollower = async () => {
      if (!id) return;
      let res = await handleGetAllFollower(id);
      if (res.statusCode === 200 && res.data) {
        setDataFollower(res.data);
      }
    };

    if (isOpen) {
      fectDataFollower();
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen, id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleGetFollowersByUser = async (user) => {
    try {
      const response = await handlePostFollower(
        currentUser.id,
        user.id?.followerId
      );
      if (response.statusCode === 201 || response.statusCode === 200) {
        sendFollowNotification({ toUserId: String(user.id?.followerId) });

        const updatedFollowers = dataFollower.map((follower) => {
          if (follower.id === user.id) {
            return { ...follower, friend: true };
          }
          return follower;
        });
        setDataFollower(updatedFollowers);
        fetchDataUser();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isOpen) return null;

  const filtered = dataFollower.filter((user) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      user.follower?.userNickname?.toLowerCase().includes(q) ||
      user.follower?.userFullname?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("userProfile.followers")}
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel w-full max-w-[400px] overflow-hidden rounded-xl border border-ig-border bg-ig-surface text-ig-text"
      >
        <div className="flex items-center justify-between border-b border-ig-rule px-4 py-3">
          <h2 className="text-[16px] font-semibold">
            {t("userProfile.followers")}
          </h2>
          <button
            type="button"
            aria-label={t("common.close")}
            className="text-ig-muted hover:text-ig-text"
            onClick={onClose}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-4 py-2.5">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("search.placeholder")}
            className="h-9 w-full rounded-lg border border-ig-border bg-ig-ground px-3 text-[14px] text-ig-text placeholder-ig-faint outline-none focus:border-ig-muted"
          />
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-ig-rule">
          {filtered.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 hover:bg-ig-raised"
            >
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={
                    user.follower?.userImage || "https://via.placeholder.com/40"
                  }
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ig-text">
                    {user.follower?.userNickname}
                  </p>
                  <p className="truncate text-[12px] text-ig-muted">
                    {user.follower?.userFullname}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`ig-press shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                  user.friend
                    ? "cursor-default border border-ig-border bg-ig-surface text-ig-muted"
                    : "bg-ig-accent text-white hover:opacity-90"
                }`}
                onClick={
                  user.friend
                    ? undefined
                    : () => handleGetFollowersByUser(user)
                }
                disabled={user.friend}
              >
                {user.friend
                  ? t("userProfile.following")
                  : t("RecommentUser.follow")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
