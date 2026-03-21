const express = require("express");
const Booking = require("../models/bookings");

const router = express.Router();
router.use(express.json());

const mapBooking = (i) => ({
  user: i.user,
  event: i.event,
  quantity: i.quantity
});

const findBookings = async (req, res) => {
  try {
    const list = await Booking.find().populate("user").populate("event").catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Booking not found" });
    // }

    return res.status(200).json((list ?? []).map(mapBooking));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findBookingById = async (req, res) => {
  try {
    const item = await Booking.findById(req.params.id).populate("user").populate("event").catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json(mapBooking(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createBooking = async (req, res) => {
  try {
    const created = await Booking.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapBooking(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateBookingById = async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("user").populate("event").catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json(mapBooking(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteBookingById = async (req, res) => {
  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ message: "Booking deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findBookings);
router.get("/:id", findBookingById);
router.post("/", createBooking);
router.put("/:id", updateBookingById);
router.delete("/:id", deleteBookingById);

module.exports = router;
