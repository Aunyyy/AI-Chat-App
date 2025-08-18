import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useJiraStore = create((set, get) => ({

  createTicket: async (userId) => {
    try {
      const res = await axiosInstance.post("/jira/create", { userId });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },
}));
