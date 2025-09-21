import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  sendLLMPrompt: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const socket = useAuthStore.getState().socket;
      const res = await axiosInstance.post(
        `/messages/${selectedUser._id}/LLM`,
        messageData
      );

      set({ messages: [...messages, ...res.data] });

      console.log("LLM Response:frontend", res.data);

      socket.on("newResponse", (newMessage) => {
        set((state) => {
          const updatedMessages = [...state.messages];
          const lastIndex = updatedMessages.length - 1;

          if (lastIndex >= 0) {
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              text: newMessage,
            };
          }

          return { messages: updatedMessages };
        });
      });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser && !newMessage.promptResponse) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    });

    socket.on("newStreamedMessage", (streamedMessage) => {
      set((state) => {
        const updatedMessages = [...state.messages];
        const lastIndex = updatedMessages.length - 1;

        if (lastIndex >= 0) {
          updatedMessages[lastIndex] = {
            ...updatedMessages[lastIndex],
            text: streamedMessage,
          };
        }
        return { messages: updatedMessages };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
