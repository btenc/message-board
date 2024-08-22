import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import indexRouter from "./routes/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "views")));

app.use("/", indexRouter);

// 404 error handler
app.use((req, res, next) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .send(
      "Something really REALLY bad happened! Check the console for more info!"
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
