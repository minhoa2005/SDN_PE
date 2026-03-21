const express = require("express");
const Category = require("../models/categories");

const router = express.Router();
router.use(express.json());

const mapCategory = (i) => ({
  name: i.name,
  description: i.description
});

const findCategories = async (req, res) => {
  try {
    const list = await Category.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Category not found" });
    // }

    return res.status(200).json((list ?? []).map(mapCategory));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findCategoryById = async (req, res) => {
  try {
    const item = await Category.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json(mapCategory(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createCategory = async (req, res) => {
  try {
    const created = await Category.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapCategory(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateCategoryById = async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json(mapCategory(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteCategoryById = async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ message: "Category deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findCategories);
router.get("/:id", findCategoryById);
router.post("/", createCategory);
router.put("/:id", updateCategoryById);
router.delete("/:id", deleteCategoryById);

module.exports = router;
