const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  quantity: {
    type: Number,
  }
});

const Bookings = mongoose.model("Booking", bookingSchema);
module.exports = Bookings;
