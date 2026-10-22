import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { handleGetAllUser } from "../../Service/UserAPI";
import { Link } from "react-router-dom";
import Route from "../../Components/Routes/index";
import { useTranslation } from "react-i18next";

const SearchBar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [originalUsers, setOriginalUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null); 

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await handleGetAllUser();
        setOriginalUsers(response.data);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value.trim() === "") {
      setFilteredUsers([]);
      return;
    }

    const filtered = originalUsers.filter(
      (user) =>
        user.userNickname.toLowerCase().includes(value) ||
        user.userFullname.toLowerCase().includes(value)
    );
    setFilteredUsers(filtered);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setFilteredUsers([]);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={searchRef}
      className="fixed bottom-14 left-0 top-0 z-[100] w-full border-r border-ig-border bg-ig-ground md:bottom-0 md:left-rail md:w-[397px]"
    >
      {/* Header */}
      <div className="sticky top-0 border-b border-ig-border bg-ig-ground px-4 pb-3 pt-3">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[24px] font-semibold text-ig-text">
            {t("search.title")}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-ig-muted transition-colors hover:text-ig-text"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="text-ig-faint" size={16} />
          </div>
          <input
            type="text"
            placeholder={t("search.placeholder")}
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded-xl bg-ig-surface py-3 pl-10 pr-10 text-[15px] text-ig-text placeholder-ig-faint focus:outline-none focus:ring-2 focus:ring-ig-accent"
          />
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ig-muted transition-colors hover:text-ig-text"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-116px)] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-ig-control border-t-ig-accent"></div>
          </div>
        ) : searchTerm ? (
          <div className="py-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Link
                  key={user.id}
                  to={`${Route.friend_profile}/${user.id}`}
                  className="flex items-center px-4 py-3 transition-colors hover:bg-ig-surface"
                >
                  <div className="relative">
                    <img
                      src={user.userImage || "https://via.placeholder.com/150"}
                      alt={user.userNickname}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-ig-ground bg-ig-text"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-ig-text text-[15px] font-semibold">
                      {user.userNickname}
                    </p>
                    <div className="flex items-center text-ig-muted text-[13px]">
                      <p>{user.userFullname}</p>
                      <span className="mx-1">•</span>
                      <p>{t("search.following")}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="mb-4">
                  <Search className="mx-auto text-ig-muted" size={32} />
                </div>
                <p className="text-ig-muted text-[15px]">
                  {t("search.noResults", { term: searchTerm })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <div className="mb-4">
              <Search className="mx-auto text-ig-muted" size={32} />
            </div>
            <p className="text-ig-muted text-[15px]">
              {t("search.searchPeople")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
