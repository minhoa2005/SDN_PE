const express = require("express");
const Event = require("../models/events");

const router = express.Router();
router.use(express.json());

const mapEvent = (i) => ({
  name: i.name,
  description: i.description,
  date: i.date,
  location: i.location,
  availableTickets: i.availableTickets
});

const findEvents = async (req, res) => {
  try {
    const list = await Event.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Event not found" });
    // }

    return res.status(200).json((list ?? []).map(mapEvent));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findEventById = async (req, res) => {
  try {
    const item = await Event.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(mapEvent(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createEvent = async (req, res) => {
  try {
    const created = await Event.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapEvent(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateEventById = async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(mapEvent(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteEventById = async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({ message: "Event deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findEvents);
router.get("/:id", findEventById);
router.post("/", createEvent);
router.put("/:id", updateEventById);
router.delete("/:id", deleteEventById);

module.exports = router;
