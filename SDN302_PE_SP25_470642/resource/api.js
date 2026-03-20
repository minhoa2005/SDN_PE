const express = require("express");
const products = require("./models/products");
const categories = require("./models/categories");
const orders = require("./models/orders")
const customers = require("./models/customers")


const mapProduct = (i) => ({
    name: i.name,
    price: i.price,
    stock: i.stock,
    category: i.category
});
const q1 = async (req, res) => {
    try {
        const list = await products.find().populate('category')

        return res.status(200).json((list ?? []).map(mapProduct));
    } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Server error" });
    }
};

const q2 = async (req, res) => {
    try {
        return res.status(200).json({});
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Server error" });
    }
};

const q3 = async (req, res) => {
    try {
        return res.status(200).json({});
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Server error" });
    }
};

const q4 = async (req, res) => {
    try {
        return res.status(200).json({});
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Server error" });
    }
};

const router = express.Router();

router.get('/api/products', q1);
router.get('/api/orders/customer/:customerId', q2);
router.get('/api/orders/:orderId', q3);
router.post('/api/orders/create', q4);

module.exports = router;