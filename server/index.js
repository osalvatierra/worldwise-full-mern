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
const path = require("path");

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

let inOtherRoute = false;

// Define a route to serve the dynamic JSON file
app.get("/cities", (req, res) => {
  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", authToken); // Log the received cookies
  const userEmail = req.query.userEmail;
  console.log("email:", userEmail);
  try {
    // Read the user's JSON file based on their email address
    fs.readFile(
      `./data/${userEmail}_cities.json`,
      "utf8",
      (error, jsonData) => {
        if (error) {
          console.error("Error reading JSON file:", error);
          res.status(500).json({ error: "Failed to import JSON file" });
        } else {
          try {
            const parsedData = JSON.parse(jsonData);

            // Check if parsedData contains 'cities' property
            if (parsedData && parsedData.cities) {
              // Return the 'cities' property as JSON response
              res.json(parsedData.cities);
            } else {
              // If 'cities' property is missing, return an error
              res.status(500).json({ error: "Cities data not found" });
            }
          } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            res.status(500).json({ error: "Failed to parse JSON data" });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

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

    // Create a new JSON file for the user's data
    const userId = req.body.email; // You can use the email as the unique identifier
    const userData = { cities: [] };
    fs.writeFileSync(`./data/${userId}_cities.json`, JSON.stringify(userData));

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

    const isPasswordValid = await bycrypt.compare(
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

// Define a route to handle POST requests to add a city to a user's cities
app.post("/cities", async (req, res) => {
  const userEmail = req.query.email;
  console.log("Received email:", userEmail); // Log the received email

  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", authToken); // Log the received cookies

  // Check if JWT token exists in the request
  if (!authToken) {
    return res.status(401).json({ error: "JWT token must be provided" });
  }

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Read the user's JSON file based on their email address
    fs.readFile(
      `./data/${userEmail}_cities.json`,
      "utf8",
      (error, jsonData) => {
        if (error) {
          console.error("Error reading JSON file:", error);
          res.status(500).json({ error: "Failed to import JSON file" });
        } else {
          try {
            const parsedData = JSON.parse(jsonData);

            // Check if parsedData contains 'cities' property
            if (parsedData && parsedData.cities) {
              // Append the new city data to the 'cities' array
              parsedData.cities.push(req.body);
            } else {
              // If 'cities' property is missing, create a new one with the new city data
              parsedData.cities = [req.body];
            }

            // Convert the updated data to JSON string
            const updatedJsonData = JSON.stringify(parsedData);

            // Write the updated JSON data back to the file
            fs.writeFile(
              `./data/${userEmail}_cities.json`,
              updatedJsonData,
              (writeError) => {
                if (writeError) {
                  console.error(
                    "Error saving cities to JSON file:",
                    writeError
                  );
                  res
                    .status(500)
                    .json({ error: "Error saving cities to JSON file" });
                } else {
                  console.log("Cities saved to JSON file successfully");
                  res.status(201).json(req.body);
                }
              }
            );
          } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            res.status(500).json({ error: "Failed to parse JSON data" });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

// Define a route to handle lat/lng specific cities drill down
app.post("/app/form/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;
  console.log("Received cookies:", req.cookies); // Log the received cookies

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Read the user's JSON file based on their email address
    fs.readFile(
      `./data/${userEmail}_cities.json`,
      "utf8",
      async (error, jsonData) => {
        if (error) {
          console.error("Error reading JSON file:", error);
          res.status(500).json({ error: "Failed to import JSON file" });
        } else {
          try {
            const parsedData = JSON.parse(jsonData);

            // Find the index of the city with the specified ID
            const index = parsedData.cities.findIndex(
              (city) => city.id === parseInt(req.params.id)
            );

            if (index === -1) {
              // City not found
              return res.status(404).json({ error: "City not found" });
            }

            // Update the latitude and longitude of the city
            parsedData.cities[index].position.lat = req.body.lat;
            parsedData.cities[index].position.lng = req.body.lng;

            // Convert the updated data to JSON string
            const updatedJsonData = JSON.stringify(parsedData);

            // Write the updated JSON data back to the file
            fs.writeFile(
              `./data/${userEmail}_cities.json`,
              updatedJsonData,
              (writeError) => {
                if (writeError) {
                  console.error(
                    "Error saving cities to JSON file:",
                    writeError
                  );
                  res
                    .status(500)
                    .json({ error: "Error saving cities to JSON file" });
                } else {
                  console.log("City coordinates updated successfully");
                  res.json({
                    message: "City coordinates updated successfully",
                  });
                }
              }
            );
          } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            res.status(500).json({ error: "Failed to parse JSON data" });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

// Define a route to handle DELETE requests to delete a city by ID from a user's cities
app.delete("/cities/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Read the user's JSON file based on their email address
    fs.readFile(
      `./data/${userEmail}_cities.json`,
      "utf8",
      (error, jsonData) => {
        if (error) {
          console.error("Error reading JSON file:", error);
          res.status(500).json({ error: "Failed to import JSON file" });
        } else {
          try {
            const parsedData = JSON.parse(jsonData);

            // Find the index of the city with the specified ID
            const index = parsedData.cities.findIndex(
              (city) => city.id === parseInt(req.params.id)
            );

            if (index === -1) {
              // City not found
              return res.status(404).json({ error: "City not found" });
            }

            // Remove the city from the array
            parsedData.cities.splice(index, 1);

            // Convert the updated data to JSON string
            const updatedJsonData = JSON.stringify(parsedData);

            // Write the updated JSON data back to the file
            fs.writeFile(
              `./data/${userEmail}_cities.json`,
              updatedJsonData,
              (writeError) => {
                if (writeError) {
                  console.error(
                    "Error saving cities to JSON file:",
                    writeError
                  );
                  res
                    .status(500)
                    .json({ error: "Error saving cities to JSON file" });
                } else {
                  console.log("City deleted successfully");
                  res.json({ message: "City deleted successfully" });
                }
              }
            );
          } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            res.status(500).json({ error: "Failed to parse JSON data" });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

// Define a route to handle lat/lng specific cities drill down
app.get("/app/cities/:id", async (req, res) => {
  const authToken = req.cookies.xaccesstoken;

  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const userEmail = decoded.email;

    // Read the user's JSON file based on their email address
    fs.readFile(
      `./data/${userEmail}_cities.json`,
      "utf8",
      async (error, jsonData) => {
        if (error) {
          console.error("Error reading JSON file:", error);
          res.status(500).json({ error: "Failed to import JSON file" });
        } else {
          try {
            const parsedData = JSON.parse(jsonData);

            // Find the city with the given ID
            const city = parsedData.cities.find(
              (city) => city.id === parseInt(req.params.id)
            );

            // If city is not found, return a 404 Not Found response
            if (!city) {
              return res.status(404).json({ error: "City not found" });
            }

            // Add latitude and longitude to the city object
            city.lat = city.position.lat;
            city.lng = city.position.lng;

            // Return the city object as JSON in the response
            res.json(city);
          } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            res.status(500).json({ error: "Failed to parse JSON data" });
          }
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.json({ status: "error", error: "invalid token" });
  }
});

app.listen(1337, () => {
  console.log("Server started on 1337");
});
