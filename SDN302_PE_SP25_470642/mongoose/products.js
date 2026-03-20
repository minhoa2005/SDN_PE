const express = require("express");
const Product = require("../models/products");

const router = express.Router();
router.use(express.json());

const mapProduct = (i) => ({
  name: i.name,
  price: i.price,
  stock: i.stock,
  category: i.category
});

const findProducts = async (req, res) => {
  try {
    const list = await Product.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Product not found" });
    // }

    return res.status(200).json((list ?? []).map(mapProduct));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findProductById = async (req, res) => {
  try {
    const item = await Product.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(mapProduct(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createProduct = async (req, res) => {
  try {
    const created = await Product.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapProduct(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateProductById = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(mapProduct(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteProductById = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findProducts);
router.get("/:id", findProductById);
router.post("/", createProduct);
router.put("/:id", updateProductById);
router.delete("/:id", deleteProductById);

module.exports = router;
