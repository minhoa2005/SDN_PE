const express = require("express");
const User = require("../models/users");

const router = express.Router();
router.use(express.json());

const mapUser = (i) => ({
  name: i.name,
  email: i.email,
  password: i.password
});

const findUsers = async (req, res) => {
  try {
    const list = await User.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "User not found" });
    // }

    return res.status(200).json((list ?? []).map(mapUser));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findUserById = async (req, res) => {
  try {
    const item = await User.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(mapUser(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createUser = async (req, res) => {
  try {
    const created = await User.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapUser(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateUserById = async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(mapUser(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteUserById = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findUsers);
router.get("/:id", findUserById);
router.post("/", createUser);
router.put("/:id", updateUserById);
router.delete("/:id", deleteUserById);

module.exports = router;
