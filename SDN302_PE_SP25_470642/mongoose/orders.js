const express = require("express");
const Order = require("../models/orders");

const router = express.Router();
router.use(express.json());

const mapOrder = (i) => ({
  customerId: i.customerId,
  products: i.products?.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    })) ?? [],
  totalPrice: i.totalPrice,
  orderDate: i.orderDate
});

const findOrders = async (req, res) => {
  try {
    const list = await Order.find().populate("customerId").populate("products.productId").catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Order not found" });
    // }

    return res.status(200).json((list ?? []).map(mapOrder));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findOrderById = async (req, res) => {
  try {
    const item = await Order.findById(req.params.id).populate("customerId").populate("products.productId").catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(mapOrder(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createOrder = async (req, res) => {
  try {
    const created = await Order.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapOrder(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateOrderById = async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("customerId").populate("products.productId").catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json(mapOrder(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteOrderById = async (req, res) => {
  try {
    const deleted = await Order.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findOrders);
router.get("/:id", findOrderById);
router.post("/", createOrder);
router.put("/:id", updateOrderById);
router.delete("/:id", deleteOrderById);

module.exports = router;
