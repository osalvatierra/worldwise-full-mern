const mongoose = require("mongoose");

const CitySchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    cities: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        country: { type: String, required: false },
        emoji: { type: String, required: false },
        date: { type: Date, required: false },
        notes: { type: String },
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
