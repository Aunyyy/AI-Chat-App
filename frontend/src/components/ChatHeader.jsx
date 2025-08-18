import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useJiraStore } from "../store/useJiraStore";
import { useEffect } from "react";

const ChatHeader = () => {
  const { createTicket } = useJiraStore();
  const { onlineUsers } = useAuthStore();
  const {
    selectedUser,
    setSelectedUser,
  } = useChatStore();
  const avatarLogo = selectedUser.fullName.charAt(0)

  const handleCreateJiraTicket = async (e) => {
    e.preventDefault();
    try {
      await createTicket(selectedUser._id);
    }
    catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  return (
    <div className="p-2.5 border-b border-base-300 bg-base-300 text-base-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar items-center justify-center size-10 rounded-full bg-primary text-primary-content text-2xl">
            {avatarLogo}
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Create Issue Button */}
        <button className="btn btn-primary font-medium ml-auto mr-1" 
          onClick={handleCreateJiraTicket}
        >
          Create Issue
        </button>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
