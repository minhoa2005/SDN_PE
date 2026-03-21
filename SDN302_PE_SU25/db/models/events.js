const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  date: {
    type: Date,
  },
  location: {
    type: String,
  },
  availableTickets: {
    type: Number,
  }
});

const Events = mongoose.model("Event", eventSchema);
module.exports = Events;
