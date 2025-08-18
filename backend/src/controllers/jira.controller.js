import JiraApi from "jira-client";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import axios from "axios";
import dotenv from 'dotenv';
import OpenAI from "openai";
import { messageToJSON } from "../prompts/prompts.js";

dotenv.config();

const JIRA_API_KEY = process.env.JIRA_API_KEY;
const DOMAIN = process.env.JIRA_DOMAIN
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY

export const createIssue = async (req, res) => {
  try {
    const { userId: userToChatId } = req.body;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).select('text -_id');

    const email = await User.findById(myId).select('email -_id');
    const auth = {
      username: email.email,
      password: JIRA_API_KEY,
    };
    const baseUrl = 'https://' + DOMAIN + '.atlassian.net';

    const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
    });
    
    const prompt = messageToJSON(messages);

    const response = await client.responses.create({
      model: "gpt-4o",
      input: prompt
    });

    const cleaned = response.output_text.replace(/```json\n/, '').replace(/```$/, '');

    // Step 2: Parse the JSON
    const jsonObj = JSON.parse(cleaned);

    console.log(jsonObj);

    const data = {
      fields: {
        project: { key: PROJECT_KEY },
        summary: jsonObj.summary,
        description: jsonObj.description,
        issuetype: { name: jsonObj.issuetype },
      }
    };
    const config = {
      headers: { 'Content-Type': 'application/json' },
      auth: auth
    };
    const jira_response = await axios.post(`${baseUrl}/rest/api/2/issue`, data, config);

    res.status(201).json({ message: "Ticket created succesfully" });

  } catch (error) {
    console.log("Error in createIssue controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
