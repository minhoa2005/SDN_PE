const express = require("express");
const Customer = require("../models/customers");

const router = express.Router();
router.use(express.json());

const mapCustomer = (i) => ({
  name: i.name,
  email: i.email,
  password: i.password,
  address: i.address,
  phone: i.phone
});

const findCustomers = async (req, res) => {
  try {
    const list = await Customer.find().catch(() => null);

    // Uncomment if you want an empty list to return 404.
    // if (!list || list.length === 0) {
    //   return res.status(404).json({ message: "Customer not found" });
    // }

    return res.status(200).json((list ?? []).map(mapCustomer));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const findCustomerById = async (req, res) => {
  try {
    const item = await Customer.findById(req.params.id).catch(() => null);

    if (!item) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json(mapCustomer(item));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const createCustomer = async (req, res) => {
  try {
    const created = await Customer.create(req.body).catch(() => null);

    if (!created) {
      return res.status(400).json({ message: "Create failed" });
    }

    return res.status(201).json(mapCustomer(created));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateCustomerById = async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).catch(() => null);

    if (!updated) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json(mapCustomer(updated));
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteCustomerById = async (req, res) => {
  try {
    const deleted = await Customer.findByIdAndDelete(req.params.id).catch(() => null);

    if (!deleted) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({ message: "Customer deleted successfully" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

router.get("/", findCustomers);
router.get("/:id", findCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomerById);
router.delete("/:id", deleteCustomerById);

module.exports = router;
