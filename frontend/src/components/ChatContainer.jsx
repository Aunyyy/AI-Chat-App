import { useChatStore } from "../store/useChatStore.js";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ReactMarkdown from 'react-markdown';

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const isSameSide = (message.senderId === authUser._id && !message.promptResponse) === (prevMessage && prevMessage.senderId === authUser._id && !prevMessage.promptResponse)
          return (
          <div
            key={message._id}
            className={`chat ${(message.senderId === authUser._id && !message.promptResponse) ? "chat-end" : "chat-start"}
            ${isSameSide ? "mb-0 py-[calc(0.15rem*1)]" : ""}`}
            ref={messageEndRef}
          >
            <div className={`rounded-xl chat-bubble flex flex-col ${(message.senderId === authUser._id && !message.promptResponse) ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"}`}>
              {message.text && <ReactMarkdown>{message.text}</ReactMarkdown>}
              <time className={`text-[10px] ${(message.senderId === authUser._id && !message.promptResponse) ? "text-primary-content self-start" : "text-base-content/70 self-end"}`}>
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
          </div>
          );
    })}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;