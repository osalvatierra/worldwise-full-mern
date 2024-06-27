const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

const mongoose = require("mongoose");
const User = require("./models/user.model");
const City = require("./models/city.model");

const app = express();

// Use morgan for logging
app.use(morgan("combined"));
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());

// Load environment variables from config.env file
dotenv.config({ path: "./config.env" });

// Define the path to the dist directory
const DIST_DIR = path.join(__dirname, "..", "client", "dist");

// Serve static files from the React app's build directory
app.use(express.static(DIST_DIR));

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
  origin: "https://worldwise-full-mern.onrender.com",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Origin, Content-Type, X-Auth-Token",
  optionsSuccessStatus: 204,
  sameSite: "Lax",
  secure: true,
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache");
  next();
});

// Serve static files from the React app's build directory
app.use(express.static(path.join(__dirname, "../client/dist")));

// Define a route to serve the dynamic JSON file
app.get("/app/cities", async (req, res) => {
  console.log("Route /app/cities accessed");
  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", authToken);

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;
    console.log("email:", userEmail);

    const userCities = await City.findOne({ userEmail });
    if (userCities && userCities.cities) {
      res.json(userCities.cities);
    } else {
      res.status(404).json({ error: "Cities data not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/app/cities", async (req, res) => {
  console.log("Received city data:", req.body); // Add logging here

  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", req.cookies);
  try {
    const { id, name, country, emoji, date, notes, position } = req.body;

    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Validate the position object
    if (
      !name ||
      !country ||
      !emoji ||
      !date ||
      !position ||
      position.lat === undefined ||
      position.lng === undefined
    ) {
      console.log("Invalid city data structure:", req.body);
      return res.status(400).json({ error: "Invalid city data structure" });
    }

    // Ensure the new city data includes all required fields
    const newCity = {
      id,
      name,
      country,
      emoji,
      date,
      notes,
      position,
    };

    console.log("Saving city to database:", newCity);

    // Find the user's cities document
    let userCities = await City.findOne({ userEmail });
    if (!userCities) {
      // If no document exists for the user, create a new one
      userCities = new City({ userEmail, cities: [newCity] });
    } else {
      // If the document exists, add the new city to the cities array
      userCities.cities.push(newCity);
    }

    await userCities.save();

    console.log("New city added successfully");
    res.status(201).json(newCity);
    // res.json({ message: "New city added successfully" });
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/app/cities", (req, res) => {
  console.log("Request body:", req.body); // Log the request body
  //... rest of the code
});

app.post("/api/register", async (req, res) => {
  console.log(req.body);

  try {
    const newPassword = await bcrypt.hash(req.body.password, 10);
    await User.create({
      name: req.body.name,
      email: req.body.email,
      password: newPassword,
      quote: req.body.quote,
    });

    // Create a new entry in the cities collection for the user's data
    await City.create({
      userEmail: req.body.email,
      cities: [],
    });

    res.json({ status: "ok" });
  } catch (error) {
    console.log(error);

    res.json({ status: "error", error: "Duplicate email" });
  }
});

// Define a function to generate access token
const generateAccessToken = (user) => {
  return jwt.sign(user, "secrete123", { expiresIn: "20m" });
};

// Define a function to generate refresh token
// process.env.REFRESH_TOKEN_SECRET ---Replace with text pass when ready
const generateRefreshToken = (user) => {
  return jwt.sign(user, "secrete456");
};

app.post("/api/login", async (req, res) => {
  inOtherRoute = false;
  try {
    // Check if the user exists in the database
    const user = await User.findOne({
      email: req.body.email,
    });

    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (isPasswordValid) {
      const accessToken = generateAccessToken({
        name: user.name,
        email: user.email,
      });

      const refreshToken = generateRefreshToken({
        name: user.name,
        email: user.email,
      });

      // Set the JWT token in a cookie using Set-Cookie header
      res.cookie("xaccesstoken", accessToken, {
        httpOnly: true,
        maxAge: 3600000, // 1 hour in milliseconds
        secure: true, // Set to true in production if using HTTPS
        sameSite: "None", // Adjust based on your needs
        path: "/",
      });

      res.cookie("xrefreshtoken", refreshToken, {
        httpOnly: true,
        maxAge: 86400000, // 1 day in milliseconds
        secure: true, // Set to true in production if using HTTPS
        sameSite: "None", // Adjust based on your needs
        path: "/",
      });

      // Set Cache-Control header to prevent caching
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      res.json({ success: true });
    } else {
      return res.json({ status: "error", user: false });
    }
  } catch (error) {
    console.log(error);
    return res.json({ status: "error", user: false });
  }
});

app.post("/api/logout", (req, res) => {
  // Access the user information attached to the request object
  console.log("Logout route called");
  inOtherRoute = true;

  const authToken = req.cookies.xaccesstoken;

  // Clear the authentication token cookie
  res.clearCookie("xaccesstoken");

  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://worldwise-full-mern.onrender.com"
    // "https://full-mern-stack-code.onrender.com"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Send response indicating successful logout
  res.status(200).json({ message: "Logout successful" });
});

// Define a route to handle refreshing the access token
app.post("/api/refresh-token", (req, res) => {
  const refreshToken = req.cookies.xrefreshtoken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token not provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, "refreshSecret");
    const accessToken = generateAccessToken({
      name: decoded.name,
      email: decoded.email,
    });

    res.cookie("xaccesstoken", accessToken, {
      httpOnly: true,
      maxAge: 86400000, // 1 day in milliseconds
      secure: true, // Set to true in production if using HTTPS
      sameSite: "None", // Adjust based on your needs
      path: "/",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error decoding refresh token:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// Define a route to handle getting the user's email
app.get("/api/user-email", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  try {
    if (!authToken) {
      return res.status(401).json({ error: "Access token not provided" });
    }

    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;
    return res.json({ email: userEmail });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // Access token has expired, try to refresh it
      const refreshToken = req.cookies.xrefreshtoken;

      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token not provided" });
      }

      try {
        const decoded = jwt.verify(refreshToken, "secrete456");
        const newAccessToken = generateAccessToken({
          name: decoded.name,
          email: decoded.email,
        });

        res.cookie("xaccesstoken", newAccessToken, {
          httpOnly: true,
          maxAge: 3600000, // 1 hour in milliseconds
          secure: true,
          sameSite: "None",
          path: "/",
        });

        // Proceed to get the user's email
        const userEmail = decoded.email;
        return res.json({ email: userEmail });
      } catch (refreshError) {
        console.error("Error decoding refresh token:", refreshError);
        return res.status(401).json({ error: "Invalid refresh token" });
      }
    } else {
      console.error("Error decoding JWT token:", error);
      return res.status(500).json({ error: "Failed to decode JWT token" });
    }
  }
});

// Define a route to handle lat/lng specific cities drill down
app.post("/app/form/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", req.cookies); // Log the received cookies

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Find the user's cities document
    const userCities = await City.findOne({ userEmail });
    if (userCities) {
      const index = userCities.cities.findIndex(
        (city) => city.id === parseInt(req.params.id)
      );
      if (index === -1) {
        return res.status(404).json({ error: "City not found" });
      }

      // Ensure the city object has all required fields before updating
      const cityToUpdate = userCities.cities[index];
      if (
        !cityToUpdate.name ||
        !cityToUpdate.id ||
        !cityToUpdate.position ||
        cityToUpdate.position.lat === undefined ||
        cityToUpdate.position.lng === undefined
      ) {
        return res.status(400).json({ error: "Invalid city data structure" });
      }

      // Update the latitude and longitude of the city
      userCities.cities[index].position.lat = req.body.lat;
      userCities.cities[index].position.lng = req.body.lng;
      await userCities.save();

      console.log("City coordinates updated successfully");
      res.json({ message: "City coordinates updated successfully" });
    } else {
      res.status(404).json({ error: "Cities data not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Define a route to handle DELETE requests to delete a city by ID from a user's cities
app.delete("/app/cities/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Find the user's cities document
    const userCities = await City.findOne({ userEmail });
    if (userCities) {
      const index = userCities.cities.findIndex(
        (city) => city.id === parseInt(req.params.id)
      );
      if (index === -1) {
        return res.status(404).json({ error: "City not found" });
      }

      // Remove the city from the array
      userCities.cities.splice(index, 1);
      await userCities.save();

      console.log("City deleted successfully");
      res.json({ message: "City deleted successfully" });
    } else {
      res.status(404).json({ error: "Cities data not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Define a route to handle lat/lng specific cities drill down
app.get("/app/cities/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Find the user's cities document in the database
    const userCities = await City.findOne({ userEmail });
    if (!userCities) {
      return res.status(404).json({ error: "Cities data not found" });
    }

    // Find the city with the given ID
    const city = userCities.cities.find(
      (city) => city.id === parseInt(req.params.id)
    );

    // If the city is not found, return a 404 Not Found response
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    // Add latitude and longitude to the city object
    city.lat = city.position.lat;
    city.lng = city.position.lng;

    // Return the city object as JSON in the response
    res.json(city);
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Catch-all route to serve the React app's index.html file
app.get("*", (req, res) => {
  console.log("Catch-all triggered");
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(1337, () => {
  console.log("Server started on 1337");
});
