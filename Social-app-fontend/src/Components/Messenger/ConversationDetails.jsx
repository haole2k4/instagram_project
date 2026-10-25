import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { MoreVertical, UserPlus, X } from "lucide-react";
import { updateConversationName } from "../../Redux/Reducer/chatSlice";
import instance from "../../Utils/AxiosApi/Axios";
import { toast } from "react-toastify";
import UserSearchModal from "./UserSearchModal";
import EditGroupNameModal from "./EditGroupNameModal";
import Route from "../../Components/Routes/index";

const ConversationDetails = ({ conversation, onClose, currentUser }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [blockStatus, setBlockStatus] = useState(false);
  const [showUserOptions, setShowUserOptions] = useState(null);
  const [groupOwner, setGroupOwner] = useState(null);
  const [showEditNameModal, setShowEditNameModal] = useState(false);

  const fetchGroupOwner = useCallback(async (conversationId) => {
    try {
      const response = await instance.get(
        `/chat/conversation/${conversationId}/owner`
      );
      if (response.data) {
        setGroupOwner(response.data);
      }
    } catch (error) {
      console.error("Error fetching group owner:", error);
    }
  }, []);

  const checkBlockStatus = useCallback(async (otherUserId) => {
    if (!currentUser?.id) return;
    try {
      const response = await instance.get(
        `/chat/block-status?userId=${currentUser.id}&otherUserId=${otherUserId}`
      );
      setBlockStatus(response.data.isBlocked || false);
    } catch (error) {
      console.error("Error checking block status:", error);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (conversation) {
      if (
        !conversation.isGroupChat &&
        conversation.participants?.length === 2
      ) {
        const otherUser = conversation.participants.find(
          (p) => (p.userId || p.id) !== currentUser?.id
        );
        if (otherUser) {
          checkBlockStatus(otherUser.userId || otherUser.id);
        }
      }
      if (conversation.isGroupChat) {
        fetchGroupOwner(conversation.id);
      }
    }
  }, [conversation, currentUser?.id, checkBlockStatus, fetchGroupOwner]);

  const handleUpdateName = async (name) => {
    if (!name || !name.trim()) return;
    try {
      await instance.put(
        `/chat/conversation/${conversation.id}/name?userId=${currentUser.id}`,
        { name }
      );
      dispatch(
        updateConversationName({
          conversationId: conversation.id,
          name,
        })
      );
      setShowEditNameModal(false);
      toast.success(t("messenger.nameUpdated"));
    } catch (error) {
      console.error("Error updating conversation name:", error);
      toast.error(t("messenger.nameUpdateError"));
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await instance.delete(
        `/chat/conversation/${conversation.id}/participant/${userId}?removerId=${currentUser.id}`
      );
      toast.success(t("messenger.userRemoved"));
      setShowUserOptions(null);
    } catch (error) {
      console.error("Error removing user:", error);
      toast.error(t("messenger.userRemoveError"));
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await instance.delete(
        `/chat/conversation/${conversation.id}/leave/${currentUser.id}`
      );
      onClose();
      toast.success(t("messenger.leftGroup"));
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error(t("messenger.leaveGroupError"));
    }
  };

  const handleBlockUser = async () => {
    if (!conversation || conversation.isGroupChat) return;

    const otherUser = conversation.participants.find(
      (p) => (p.userId || p.id) !== currentUser.id
    );

    if (!otherUser) return;

    try {
      const endpoint = blockStatus ? "unblock" : "block";
      await instance.post(
        `/follow/${endpoint}?followerId=${currentUser.id}&followingId=${
          otherUser.userId || otherUser.id
        }`
      );

      setBlockStatus(!blockStatus);
      toast.success(
        blockStatus ? t("messenger.userUnblocked") : t("messenger.userBlocked")
      );
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast.error(t("messenger.blockActionError"));
    }
  };

  const handleAddMembers = (selectedUserIds) => {
    if (!selectedUserIds || selectedUserIds.length === 0) return;

    const existingUserIds = conversation.participants.map(
      (p) => p.userId || p.id
    );
    const newUserIds = selectedUserIds.filter(
      (id) => !existingUserIds.includes(id)
    );

    if (newUserIds.length === 0) {
      toast.info(t("messenger.noNewMembers"));
      return;
    }
    Promise.all(
      newUserIds.map((userId) =>
        instance.post(`/chat/conversation/${conversation.id}/add-member`, {
          userId,
          addedByUserId: currentUser.id,
        })
      )
    )
      .then(() => {
        toast.success(t("messenger.membersAdded"));
        setShowAddMembersModal(false);
      })
      .catch((error) => {
        console.error("Error adding members:", error);
        toast.error(t("messenger.addMemberError"));
      });
  };

  const isGroupOwner = groupOwner && groupOwner.id === currentUser.id;

  return (
    <div className="flex h-full flex-col border-l border-ig-border bg-ig-ground text-ig-text">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-ig-border px-4">
        <h2 className="text-[16px] font-semibold text-ig-text">
          {t("messenger.details")}
        </h2>
        <button
          type="button"
          aria-label={t("story.close")}
          title={t("story.close")}
          className="ig-press flex h-9 w-9 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-surface hover:text-ig-text"
          onClick={onClose}
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversation.isGroupChat && (
          <div className="mb-6">
            <p className="mb-1 text-[12px] text-ig-muted">
              {t("messenger.conversationName")}
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[16px] font-semibold text-ig-text">
                {conversation.name || t("messenger.untitledGroup")}
              </p>
              <button
                type="button"
                onClick={() => setShowEditNameModal(true)}
                className="ig-press text-[14px] font-semibold text-ig-accent hover:opacity-85"
              >
                {t("messenger.edit")}
              </button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-ig-muted tabular-nums">
              {t("messenger.members")} ({conversation.participants?.length || 0})
            </h3>

            {conversation.isGroupChat && (
              <button
                type="button"
                onClick={() => setShowAddMembersModal(true)}
                className="ig-press flex items-center gap-1.5 text-[14px] font-semibold text-ig-accent hover:opacity-85"
              >
                <UserPlus size={15} strokeWidth={1.5} />
                <span>{t("messenger.addMembers")}</span>
              </button>
            )}
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {conversation.participants?.map((participant) => {
              const pid = participant.userId || participant.id;
              const isCurrentUser = pid === currentUser.id;
              const isOwner = groupOwner && pid === groupOwner.id;

              return (
                <div
                  key={pid}
                  className="flex h-14 items-center justify-between rounded-lg px-2 transition-colors hover:bg-ig-surface"
                >
                  <Link
                    to={`${Route.friend_profile}/${pid}`}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <img
                      src={participant.userImage || "/default-avatar.png"}
                      alt={
                        participant.userFullname ||
                        participant.userNickname ||
                        ""
                      }
                      className="h-10 w-10 shrink-0 rounded-full bg-ig-surface object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ig-text">
                        {participant.userFullname || participant.userNickname}
                        {isCurrentUser && (
                          <span className="ml-1.5 text-[12px] text-ig-muted">
                            ({t("messenger.you")})
                          </span>
                        )}
                        {isOwner && (
                          <span className="ml-1.5 text-[12px] text-ig-muted">
                            ({t("messenger.groupOwner")})
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[12px] text-ig-muted">
                        @{participant.userNickname}
                      </p>
                    </div>
                  </Link>

                  {conversation.isGroupChat &&
                    !isCurrentUser &&
                    isGroupOwner && (
                      <div className="relative">
                        <button
                          type="button"
                          aria-label={t("story.options")}
                          title={t("story.options")}
                          onClick={() =>
                            setShowUserOptions(
                              showUserOptions === pid ? null : pid
                            )
                          }
                          className="ig-press flex h-8 w-8 items-center justify-center rounded-lg text-ig-muted hover:bg-ig-raised hover:text-ig-text"
                        >
                          <MoreVertical size={16} strokeWidth={1.5} />
                        </button>

                        {showUserOptions === pid && (
                          <div className="ig-modal-panel absolute right-0 z-10 mt-1 w-44 rounded-panel border border-ig-border bg-ig-raised p-1.5 shadow-lg">
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(pid)}
                              className="w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium text-ig-like hover:bg-ig-surface"
                            >
                              {t("messenger.removeFromGroup")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-ig-border p-4">
        {conversation.isGroupChat ? (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={handleLeaveGroup}
              className="ig-press self-start text-[14px] font-semibold text-ig-like hover:opacity-85"
            >
              {t("messenger.leaveGroup")}
            </button>
            <p className="mt-1 text-[12px] text-ig-muted">
              {t("messenger.leaveGroupNote")}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBlockUser}
            className={`ig-press self-start text-[14px] font-semibold hover:opacity-85 ${
              blockStatus ? "text-ig-accent" : "text-ig-like"
            }`}
          >
            {blockStatus
              ? t("messenger.unblockUser")
              : t("messenger.blockUser")}
          </button>
        )}
      </div>

      {showAddMembersModal && (
        <UserSearchModal
          isOpen={showAddMembersModal}
          onClose={() => setShowAddMembersModal(false)}
          onSelectUsers={handleAddMembers}
          currentUserId={currentUser.id}
          isForAddingMembers={true}
          excludeUserIds={
            conversation.participants?.map((p) => p.userId || p.id) || []
          }
        />
      )}

      {showEditNameModal && (
        <EditGroupNameModal
          isOpen={showEditNameModal}
          onClose={() => setShowEditNameModal(false)}
          currentName={conversation.name || ""}
          onSave={handleUpdateName}
        />
      )}
    </div>
  );
};

export default ConversationDetails;
