const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, unique: true },
    cities: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        position: {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
      },
    ],
  },
  { collection: "cities-data" }
);

const City = mongoose.model("City", CitySchema);

module.exports = City;
