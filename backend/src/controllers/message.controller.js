import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import OpenAI from "openai";
import mongoose from "mongoose";

import { getReceiverSocketId, io } from "../lib/socket.js";
import { response } from "express";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

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
      promptResponse: false,
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

export const sendLLMPrompt = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const senderId = req.user._id;
    const { id: receiverId } = req.params;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const { text, image } = req.body;

    let imageUrl;

    const editedText = `@ChatAI ${text}`;

    const newPrompt = new Message({
      senderId,
      receiverId,
      text: editedText,
      promptResponse: false,
      image: imageUrl,
    });

    const newResponse = new Message({
      senderId: receiverId,
      receiverId: senderId,
      text: "Loading...",
      promptResponse: true,
      image: imageUrl,
    });

    await newPrompt.save({ session });
    await newResponse.save({ session });

    const streamedResponse = await client.responses.create({
      model: "gpt-4o",
      input: text,
      stream: true,
    });

    res.status(201).json([newPrompt, newResponse]);

    // console.log("LLM Response:backend", response);

    //Reciever Socket ID
    const receiverSocketId = getReceiverSocketId(receiverId);
    //Sender Socket ID
    const currentSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newPrompt);
      io.to(receiverSocketId).emit("newMessage", newResponse);
    }

    newResponse.text = "";
    console.log("Streaming response...");
    for await (const chunk of streamedResponse) {
      if (chunk.type === "response.output_text.delta") {
        const token = chunk.delta || "";
        newResponse.text += token;
        // Send partial token to the client
        io.to(currentSocketId).emit("newResponse", newResponse.text);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newStreamedMessage", newResponse.text);
        }
        await new Promise((resolve) => setTimeout(resolve, 100)); // 200ms delay
      }
    }

    io.to(currentSocketId).emit("newResponseComplete");
    await newResponse.save({ session });
    await session.commitTransaction();
    await session.endSession();
  } catch (error) {
    console.log("Error in sendLLMPrompt controller: ", error.message);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: "Internal server error" });
  }
};
