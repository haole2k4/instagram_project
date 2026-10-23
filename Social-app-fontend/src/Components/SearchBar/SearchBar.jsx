import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { handleGetAllUser } from "../../Service/UserAPI";
import { Link } from "react-router-dom";
import Route from "../../Components/Routes/index";
import { useTranslation } from "react-i18next";
import { RowListSkeleton } from "../Common/FlatSkeleton";
import EmptyState from "../Common/EmptyState";

const SearchBar = ({ isOpen = true, onClose, standalone = false }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [originalUsers, setOriginalUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await handleGetAllUser();
        setOriginalUsers(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || standalone || !onClose) return;

    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, standalone]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const normalized = value.toLowerCase().trim();

    if (!normalized) {
      setFilteredUsers([]);
      return;
    }

    const filtered = originalUsers.filter(
      (user) =>
        (user.userNickname || "").toLowerCase().includes(normalized) ||
        (user.userFullname || "").toLowerCase().includes(normalized)
    );
    setFilteredUsers(filtered);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setFilteredUsers([]);
  };

  if (!isOpen) return null;

  const containerClass = standalone
    ? "mx-auto flex w-full max-w-[630px] flex-col rounded-panel border border-ig-border bg-ig-ground"
    : "fixed bottom-14 left-0 top-0 z-[100] flex w-full flex-col border-r border-ig-border bg-ig-ground md:bottom-0 md:left-rail md:w-[397px]";

  const HeadingTag = standalone ? "h1" : "h2";

  return (
    <div ref={searchRef} className={containerClass}>
      <div className="sticky top-0 border-b border-ig-border bg-ig-ground px-4 pb-3 pt-3">
        <div className="mb-4 flex items-center justify-between">
          <HeadingTag className="text-[24px] font-semibold text-ig-text">
            {t("search.title")}
          </HeadingTag>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("search.close")}
              title={t("search.close")}
              className="rounded-lg p-2 text-ig-muted transition-colors hover:text-ig-text"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Search className="text-ig-faint" size={16} strokeWidth={1.5} />
          </div>
          <input
            type="text"
            aria-label={t("search.placeholder")}
            placeholder={t("search.placeholder")}
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded-xl bg-ig-surface py-2.5 pl-10 pr-10 text-[14px] text-ig-text placeholder-ig-faint focus:outline-none focus:ring-2 focus:ring-ig-accent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label={t("search.clear")}
              title={t("search.clear")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ig-muted transition-colors hover:text-ig-text"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <RowListSkeleton count={5} rowHeight="h-16" />
        ) : searchTerm.trim() ? (
          <div className="py-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Link
                  key={user.id}
                  to={`${Route.friend_profile}/${user.id}`}
                  onClick={onClose}
                  className="flex h-16 items-center px-4 transition-colors hover:bg-ig-surface"
                >
                  <div className="relative shrink-0">
                    <img
                      src={user.userImage || "/default-avatar.png"}
                      alt={user.userNickname || ""}
                      className="h-11 w-11 rounded-full bg-ig-surface object-cover"
                    />
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ig-ground bg-ig-text" />
                    )}
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ig-text">
                      {user.userNickname}
                    </p>
                    {user.userFullname && (
                      <p className="truncate text-[12px] text-ig-muted">
                        {user.userFullname}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={Search}
                title={t("search.noResults", { term: searchTerm })}
                description={t("search.tryDifferentKeyword")}
              />
            )}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title={t("search.searchPeople")}
            description={t("search.placeholder")}
          />
        )}
      </div>
    </div>
  );
};

export default SearchBar;
