const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");

const mongoose = require("mongoose");
const User = require("./models/user.model");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcryptjs");
const morgan = require("morgan");
const dotenv = require("dotenv");

// Use morgan for logging
app.use(morgan("combined"));
app.use(express.json());
app.use(cookieParser());

// Load environment variables from config.env file
dotenv.config({ path: "./config.env" });

// Database connection
mongoose.connect(process.env.DB_CONNECTION_STRING, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

const corsOptions = {
  origin: "https://full-mern-stack-code.onrender.com",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Origin, Content-Type, X-Auth-Token",
  optionsSuccessStatus: 204,
  sameSite: "None",
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache");
  next();
});

let inOtherRoute = false;

app.post("/api/register", async (req, res) => {
  console.log(req.body);

  try {
    const newPassword = await bycrypt.hash(req.body.password, 10);
    await User.create({
      name: req.body.name,
      email: req.body.email,
      password: newPassword,
      quote: req.body.quote,
    });
    res.json({ status: "ok" });
  } catch (error) {
    console.log(error);

    res.json({ status: "error", error: "Duplicate email" });
  }
});

app.post("/api/login", async (req, res) => {
  inOtherRoute = false;
  try {
    // Check if the user exists in the database
    const user = await User.findOne({
      email: req.body.email,
    });

    const isPasswordValid = await bycrypt.compare(
      req.body.password,
      user.password
    );

    if (isPasswordValid) {
      const token = jwt.sign(
        {
          name: user.name,
          email: user.email,
        },

        "secrete123",
        {
          expiresIn: "20m",
        }
      );

      // Set the JWT token in a cookie using Set-Cookie header
      res.cookie("xaccesstoken", token, {
        httpOnly: true,
        maxAge: 3600000, // 1 hour in milliseconds
        secure: true, // Set to true in production if using HTTPS
        sameSite: "None", // Adjust based on your needs
        path: "/",
      });

      res.json({ success: true });
    } else {
      return res.json({ status: "error", user: false });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: "error", user: false });
  }
});

app.get("/api/quote", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  if (!authToken) {
    res.redirect("/login");

    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const email = decoded.email;
    const user = await User.findOne({ email: email });
    console.log(user);

    if (inOtherRoute === true) {
      res.cookie(authToken, { expires: Date.now(0) });
      res.clearCookie(authToken, { path: "/" });
      res.redirect("/login");
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ status: "ok", quote: user.quote });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

app.post("/api/quote", async (req, res) => {
  //const token = req.headers["x-access-token"];
  const authToken = req.cookies.xaccesstoken;
  if (!authToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const email = decoded.email;
    await User.updateOne({ email: email }, { $set: { quote: req.body.quote } });
    if (inOtherRoute === true) {
      res.cookie(authToken, { expires: Date.now(0) });
      res.clearCookie(authToken, { path: "/" });
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

app.post("/api/logout", (req, res) => {
  // Access the user information attached to the request object
  console.log("Logout route called");
  inOtherRoute = true;

  const authToken = req.cookies.xaccesstoken;

  res.cookie(authToken, "", { expires: new Date(0) });
  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://full-mern-stack-code.onrender.com"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(200).json({ message: "Logout successful" });
  res.status(200).json({ message: "Logout successful" });
});

app.post("/login", (req, res) => {
  console.log("Logout route called");
});

// Define a route to serve the dynamic JSON file
app.get("/cities", (req, res) => {
  fs.readFile("./data/cities.json", "utf8", (error, jsonData) => {
    if (error) {
      console.error("Error reading JSON file:", error);
      res.status(500).json({ error: "Failed to import JSON file" });
    } else {
      try {
        const parsedData = JSON.parse(jsonData);
        res.json(parsedData);
      } catch (parseError) {
        console.error("Error parsing JSON data:", parseError);
        res.status(500).json({ error: "Failed to parse JSON data" });
      }
    }
  });
});

app.listen(1337, () => {
  console.log("Server started on 1337");
});
