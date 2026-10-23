import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import instance from "../../Utils/AxiosApi/Axios";
import { RowListSkeleton } from "../Common/FlatSkeleton";

const UserSearchModal = ({
  isOpen,
  onClose,
  onSelectUser,
  onCreateGroup,
  onSelectUsers,
  currentUserId,
  isForAddingMembers = false,
  excludeUserIds = [],
}) => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (isOpen && !fetchAttempted) {
      fetchFriends();
      setFetchAttempted(true);
    }
    if (!isOpen) {
      setFetchAttempted(false);
    }
  }, [isOpen, fetchAttempted]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchFriends = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const followingRes = await instance.get(
        `/follow/following/${currentUserId}`
      );
      const followingData = followingRes.data || [];

      const friends = followingData
        .filter((item) => item.friend === true)
        .map((item) => item.following);

      const conversationsRes = await instance.get(
        `/chat/conversationUsers/${currentUserId}`
      );
      const conversationUsers = conversationsRes.data || [];

      const allUserIds = new Set([
        ...friends.map((friend) => friend.id),
        ...conversationUsers.map((user) => user.id),
      ]);

      const filteredUserIds = Array.from(allUserIds).filter(
        (id) => !excludeUserIds.includes(id)
      );

      const uniqueUsers = filteredUserIds
        .map((id) => {
          const friend = friends.find((f) => f.id === id);
          if (friend) return friend;
          return conversationUsers.find((u) => u.id === id);
        })
        .filter(Boolean);

      setUsers(uniqueUsers);
    } catch (e) {
      console.error("Error fetching friends:", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([]);
      setGroupName("");
      setSearchTerm("");
    }
  }, [isOpen]);

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (selectedUsers.length >= 2 && groupName.trim()) {
      onCreateGroup({
        name: groupName.trim(),
        userIds: [currentUserId, ...selectedUsers],
      });
    } else if (selectedUsers.length === 1 && onSelectUser) {
      onSelectUser(selectedUsers[0]);
    }
  };

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      onSelectUsers(selectedUsers);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.userFullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userNickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ig-ground/80 p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          isForAddingMembers
            ? t("messenger.addMembers")
            : t("messenger.newConversation")
        }
        onClick={(e) => e.stopPropagation()}
        className="ig-modal-panel w-full max-w-md overflow-hidden rounded-panel border border-ig-border bg-ig-raised text-ig-text shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-ig-border px-4 py-3">
          <h2 className="text-[16px] font-semibold text-ig-text">
            {isForAddingMembers
              ? t("messenger.addMembers")
              : t("messenger.newConversation")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("story.close")}
            title={t("story.close")}
            className="ig-press flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-4">
          {!isForAddingMembers && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("messenger.groupName")}
              className="mb-3 w-full rounded-xl border border-ig-border bg-ig-surface px-3.5 py-2 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
            />
          )}

          <p className="mb-2 text-[12px] text-ig-muted tabular-nums">
            {isForAddingMembers
              ? t("messenger.selectUsersToAdd")
              : t("messenger.selectMinTwoUsers")}
            {selectedUsers.length > 0 &&
              ` (${selectedUsers.length} ${t("messenger.selected")})`}
          </p>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("messenger.searchFriends")}
            className="mb-3 w-full rounded-xl border border-ig-border bg-ig-surface px-3.5 py-2 text-[14px] text-ig-text placeholder-ig-faint focus:border-ig-accent focus:outline-none"
          />

          {loading ? (
            <div className="max-h-72 overflow-hidden">
              <RowListSkeleton count={4} rowHeight="h-14" />
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex h-14 cursor-pointer items-center rounded-lg px-2 transition-colors hover:bg-ig-surface"
                    onClick={() => toggleUser(user.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="mr-3 h-4 w-4 accent-[#0095f6]"
                    />
                    <img
                      src={user.userImage || "/default-avatar.png"}
                      alt={user.userFullname || ""}
                      className="mr-3 h-10 w-10 shrink-0 rounded-full bg-ig-surface object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ig-text">
                        {user.userFullname}
                      </p>
                      <p className="truncate text-[12px] text-ig-muted">
                        @{user.userNickname}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-[14px] text-ig-muted">
                  {searchTerm
                    ? t("messenger.noUsersFound")
                    : t("messenger.noUsers")}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2 border-t border-ig-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="ig-press rounded-control border border-ig-border bg-ig-surface px-4 py-2 text-[14px] font-medium text-ig-text hover:bg-ig-ground"
            >
              {t("messenger.cancel")}
            </button>
            <button
              type="button"
              onClick={
                isForAddingMembers ? handleAddMembers : handleCreateGroup
              }
              className="ig-press rounded-control bg-ig-accent px-4 py-2 text-[14px] font-semibold text-ig-text hover:opacity-90 disabled:opacity-40"
              disabled={
                isForAddingMembers
                  ? selectedUsers.length < 1
                  : selectedUsers.length < 1 ||
                    (selectedUsers.length >= 2 && !groupName.trim())
              }
            >
              {isForAddingMembers
                ? t("messenger.addSelected")
                : selectedUsers.length === 1
                ? t("messenger.send")
                : t("messenger.createGroup")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
