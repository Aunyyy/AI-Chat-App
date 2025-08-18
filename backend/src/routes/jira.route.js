import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createIssue } from "../controllers/jira.controller.js";

const router = express.Router();

router.post("/create", protectRoute, createIssue)
export default router;