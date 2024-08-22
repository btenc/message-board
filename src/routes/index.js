import express from "express";
import {
  index,
  newMessageForm,
  createMessage,
  viewMessage,
  likeMessage,
} from "../controllers/indexController.js";

const router = express.Router();

// GET home page
router.get("/", index);

// GET new message form
router.get("/new", newMessageForm);

// POST new message
router.post("/new", createMessage);

// GET message details
router.get("/message/:id", viewMessage);

// POST like a message
router.post("/message/:id/like", likeMessage);

export default router;
