import expressAsyncHandler from "express-async-handler";
import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Filter } from "bad-words";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT),
});

const messagesPerPage = 6; // Number of messages per page
let ipMessageCounts = {}; // Object to track IP-based message limits

// Reset IP counts every 24 hours
setInterval(
  () => {
    ipMessageCounts = {};
  },
  24 * 60 * 60 * 1000
); // 24 hours in milliseconds

function normalizeIp(ip) {
  if (ip.startsWith("::ffff:")) {
    return ip.split(":").pop(); // Extract the IPv4 part of the address
  }
  return ip;
}

function getRealIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0] : normalizeIp(req.ip);
}

export const index = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const sortBy = req.query.sortBy || "date";
  const userIp = getRealIp(req);

  const resultCount = await pool.query("SELECT COUNT(*) FROM messages");
  const totalMessages = parseInt(resultCount.rows[0].count, 10);
  const totalPages = Math.ceil(totalMessages / messagesPerPage);

  if ((page > totalPages && totalPages > 0) || page < 0) {
    return res.status(404).render("404", { title: "Page Not Found" });
  }

  let sortQuery = "ORDER BY added DESC";
  if (sortBy === "likes") {
    sortQuery = "ORDER BY likes DESC";
  }

  const offset = (page - 1) * messagesPerPage;
  const messagesResult = await pool.query(
    `SELECT * FROM messages ${sortQuery} LIMIT $1 OFFSET $2`,
    [messagesPerPage, offset]
  );

  const messagesWithUserLikeInfo = messagesResult.rows.map((message) => ({
    ...message,
    userHasLiked: message.liked_by.includes(userIp),
  }));

  res.render("index", {
    title: "Chatterbox",
    messages: messagesWithUserLikeInfo,
    currentPage: page,
    totalPages: totalPages,
    totalMessages: totalMessages,
    messagesPerPage: messagesPerPage,
    sortBy: sortBy,
  });
});

export const viewMessage = expressAsyncHandler(async (req, res) => {
  const messageResult = await pool.query(
    "SELECT * FROM messages WHERE id = $1",
    [req.params.id]
  );

  if (messageResult.rows.length === 0) {
    return res.status(404).render("404", { title: "Blip Not Found" });
  }

  const message = messageResult.rows[0];
  const userHasLiked = message.liked_by.includes(req.ip);

  res.render("message", {
    title: "Blip Details",
    message,
    userHasLiked,
  });
});

export const newMessageForm = expressAsyncHandler(async (req, res) => {
  res.render("form", { title: "Add a New Blip" });
});

export const createMessage = expressAsyncHandler(async (req, res) => {
  const { messageText, messageUser } = req.body;
  const userIp = getRealIp(req);

  // Check if IP is already in the ipMessageCounts object
  if (!ipMessageCounts[userIp]) {
    ipMessageCounts[userIp] = 0;
  }

  // Check if the IP has exceeded the limit
  if (ipMessageCounts[userIp] >= 10) {
    return res.render("form", {
      title: "Add a New Blip",
      error:
        "You have reached the daily limit of 10 blips. Please try again tomorrow.",
    });
  }

  // Create a new instance of Filter each time the function is called
  const filter = new Filter();

  // Check for profanity
  if (filter.isProfane(messageUser) || filter.isProfane(messageText)) {
    return res.render("form", {
      title: "Add a New Blip",
      error:
        "Your blip contains inappropriate language. Please modify your message.",
    });
  }

  if (!messageUser || !messageText) {
    return res.render("form", {
      title: "Add a New Blip",
      error: "Both username and blip are required.",
    });
  }

  if (messageUser.length > 40) {
    return res.render("form", {
      title: "Add a New Blip",
      error: "Username exceeds 40 characters. Please shorten your username.",
    });
  }

  if (messageText.length > 200) {
    return res.render("form", {
      title: "Add a New Blip",
      error: "Blip exceeds 200 characters. Please shorten your blip.",
    });
  }

  // Insert the new message into the database
  const insertResult = await pool.query(
    "INSERT INTO messages (text, \"username\", likes, liked_by) VALUES ($1, $2, 0, '{}') RETURNING *",
    [messageText, messageUser]
  );

  // Increment the message count for this IP
  ipMessageCounts[userIp]++;

  res.redirect("/");
});

export const likeMessage = expressAsyncHandler(async (req, res) => {
  const messageId = req.params.id;
  const userIp = getRealIp(req);

  const messageResult = await pool.query(
    "SELECT * FROM messages WHERE id = $1",
    [messageId]
  );

  if (messageResult.rows.length === 0) {
    return res.status(404).render("404", { title: "Message Not Found" });
  }

  const message = messageResult.rows[0];

  if (message.liked_by.includes(userIp)) {
    await pool.query(
      "UPDATE messages SET likes = likes - 1, liked_by = array_remove(liked_by, $1) WHERE id = $2",
      [userIp, messageId]
    );
  } else {
    await pool.query(
      "UPDATE messages SET likes = likes + 1, liked_by = array_append(liked_by, $1) WHERE id = $2",
      [userIp, messageId]
    );
  }

  res.redirect(req.get("referer"));
});
