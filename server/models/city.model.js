const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    cities: { type: Array, default: [] },
  },
  { collection: "cities-data" }
);

const City = mongoose.model("City", CitySchema);

module.exports = City;
