const express = require("express");
const Categorie = require("../models/categories");

const router = express.Router();
router.use(express.json());

const mapCategorie = (i) => ({
  name: i.name,
  description: i.description
});

const findCategories = async (req, res) => {
  try {
    const list = await Categorie.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Categorie not found" });
    // }

    return res.status(200).json((list ?? []).map(mapCategorie));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findCategorieById = async (req, res) => {
  try {
    const item = await Categorie.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Categorie not found" });
    }

    return res.status(200).json(mapCategorie(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createCategorie = async (req, res) => {
  try {
    const created = await Categorie.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapCategorie(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateCategorieById = async (req, res) => {
  try {
    const updated = await Categorie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Categorie not found" });
    }

    return res.status(200).json(mapCategorie(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteCategorieById = async (req, res) => {
  try {
    const deleted = await Categorie.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Categorie not found" });
    }

    return res.status(200).json({ message: "Categorie deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findCategories);
router.get("/:id", findCategorieById);
router.post("/", createCategorie);
router.put("/:id", updateCategorieById);
router.delete("/:id", deleteCategorieById);

module.exports = router;
