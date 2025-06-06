const mongoose = require("mongoose");

const User = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    quote: { type: String, required: false },
  },
  { collection: "user-data" }
);

const model = mongoose.model("User", User);

module.exports = model;
