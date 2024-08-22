import express from "express";
import {
  index,
  newMessageForm,
  createMessage,
  viewMessage,
  likeMessage,
} from "../controllers/indexController.js";

const router = express.Router();

router.get("/", index);
router.get("/new", newMessageForm);
router.post("/new", createMessage);
router.get("/message/:id", viewMessage);
router.post("/message/:id/like", likeMessage);

export default router;
