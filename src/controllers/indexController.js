import expressAsyncHandler from "express-async-handler";
import { Filter } from "bad-words";

let messages = [
  {
    id: 1,
    text: "First",
    user: "Bill",
    added: new Date(),
    likes: 1,
    likedBy: [],
  },
];

const messagesPerPage = 8; // Number of messages per page

export const index = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const sortBy = req.query.sortBy || "date"; // Default sorting is by date
  const totalMessages = messages.length;
  const totalPages = Math.ceil(totalMessages / messagesPerPage);
  const userIp = req.ip;

  if (page > totalPages || page < 1) {
    return res.status(404).render("404", { title: "Page Not Found" });
  }

  let sortedMessages;
  if (sortBy === "likes") {
    sortedMessages = [...messages].sort((a, b) => b.likes - a.likes);
  } else {
    sortedMessages = [...messages].sort((a, b) => b.id - a.id);
  }

  const startIndex = (page - 1) * messagesPerPage;
  const endIndex = page * messagesPerPage;

  const paginatedMessages = sortedMessages.slice(startIndex, endIndex);

  const messagesWithUserLikeInfo = paginatedMessages.map((message) => ({
    ...message,
    userHasLiked: message.likedBy.includes(userIp),
  }));

  res.render("index", {
    title: "Chatterbox",
    messages: messagesWithUserLikeInfo,
    currentPage: page,
    totalPages: totalPages,
    totalMessages: totalMessages,
    messagesPerPage: messagesPerPage,
    sortBy: sortBy, // Pass the sortBy parameter to the template
  });
});

// View individual message handler
export const viewMessage = expressAsyncHandler(async (req, res) => {
  const message = messages.find((m) => m.id === parseInt(req.params.id, 10));

  if (!message) {
    return res.status(404).render("404", { title: "Blip Not Found" });
  }

  const userIp = req.ip;
  const userHasLiked = message.likedBy.includes(userIp);

  res.render("message", {
    title: "Blip Details",
    message,
    userHasLiked,
  });
});

// Render form to create a new message
export const newMessageForm = expressAsyncHandler(async (req, res) => {
  res.render("form", { title: "Add a New Blip" });
});

let ipMessageCounts = {};

// Reset IP counts every 24 hours
setInterval(
  () => {
    ipMessageCounts = {};
  },
  24 * 60 * 60 * 1000
); // 24 hours in milliseconds

export const createMessage = expressAsyncHandler(async (req, res) => {
  const { messageText, messageUser } = req.body;
  const userIp = req.ip;

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

  // Assign a unique ID to the new message
  const newId = messages.length ? messages[messages.length - 1].id + 1 : 1;

  // Create the new message object
  const newMessage = {
    id: newId,
    text: messageText,
    user: messageUser,
    added: new Date(),
    likes: 0,
    likedBy: [],
  };

  // Increment the message count for this IP
  ipMessageCounts[userIp]++;

  // Add the new message to the beginning of the array
  messages.push(newMessage);

  res.redirect("/");
});

// Handle liking a message
export const likeMessage = expressAsyncHandler(async (req, res) => {
  const message = messages.find((m) => m.id === parseInt(req.params.id, 10));
  const userIp = req.ip;

  if (message) {
    if (message.likedBy.includes(userIp)) {
      message.likes -= 1;
      message.likedBy = message.likedBy.filter((ip) => ip !== userIp);
    } else {
      message.likes += 1;
      message.likedBy.push(userIp);
    }

    res.redirect(req.get("referer"));
  } else {
    res.status(404).render("404", { title: "Message Not Found" });
  }
});
