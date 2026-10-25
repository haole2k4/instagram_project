import React, { useEffect, useState } from "react";
import { handleGetAllFollowing } from "../../../../Service/Folower";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export default function ControllFlowering({ isOpening, onClosing, id }) {
  const [dataFollowering, setDataFollowering] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const fectDataFollowering = async () => {
      if (!id) return;
      let res = await handleGetAllFollowing(id);
      if (res.statusCode === 200 && res.data) {
        setDataFollowering(res.data);
      }
    };

    if (isOpening) {
      fectDataFollowering();
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpening, id]);

  useEffect(() => {
    if (!isOpening) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClosing?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpening, onClosing]);

  if (!isOpening) return null;

  const filtered = dataFollowering.filter((user) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      user.following?.userNickname?.toLowerCase().includes(q) ||
      user.following?.userFullname?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClosing}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("userProfile.following")}
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel w-full max-w-[400px] overflow-hidden rounded-xl border border-ig-border bg-ig-surface text-ig-text"
      >
        <div className="flex items-center justify-between border-b border-ig-rule px-4 py-3">
          <h2 className="text-[16px] font-semibold">
            {t("userProfile.following")}
          </h2>
          <button
            type="button"
            aria-label={t("common.close")}
            className="text-ig-muted hover:text-ig-text"
            onClick={onClosing}
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
                    user.following?.userImage ||
                    "https://via.placeholder.com/40"
                  }
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ig-text">
                    {user.following?.userNickname}
                  </p>
                  <p className="truncate text-[12px] text-ig-muted">
                    {user.following?.userFullname}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-lg border border-ig-border bg-ig-surface px-3 py-1.5 text-[13px] font-medium text-ig-muted">
                {t("userProfile.following")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
