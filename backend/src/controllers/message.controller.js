import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import OpenAI from "openai";

import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendLMMPrompt = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const { text, image } = req.body;

    let imageUrl;

    const response = await client.responses.create({
      model: "gpt-4o",
      input: text
    });
    console.log("LMM Response:backend", response);

    const editedText = `@ChatAI ${text}`;

    const newPrompt = new Message({
      senderId,
      receiverId,
      text: editedText,
      image: imageUrl,
    });
    
    const newMessage = new Message({
      senderId: receiverId,
      receiverId: senderId,
      text: response.output_text,
      image: imageUrl,
    });

    await newPrompt.save();
    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newPrompt);
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json([newPrompt, newMessage]);
  } catch (error) {
    console.log("Error in sendLMMPrompt controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}
