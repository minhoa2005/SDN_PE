const express = require("express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

const mapOrder = (i) => ({
    customerId: i.customerId,
    products: i.products?.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
    })) ?? [],
    totalPrice: i.totalPrice,
    orderDate: i.orderDate
});

const mapCustomerProfile = (i) => ();

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
        const cid = req.params.customerId
        console.log(cid)

        const list = await orders.find({ customerId: cid }).populate("customerId").populate("products.productId").catch(() => null);

        const ordersResData = list.map((i) => ({
            _id: i._id,
            orderDate: i.orderDate,
            products: i.products?.map((item) => ({
                _id: item.productId._id,
                name: item.productId.name,
                price: item.productId.price
            })) ?? [],
        }));

        return res.status(200).json(ordersResData);
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Server error" });
    }
};

const q3 = async (req, res) => {
    try {

        const i = await orders.findById(req.params.orderId).populate("customerId").populate("products.productId").catch(() => null);

        if (!i) {
            return res.status(404).json({ message: "Order not found" });
        }

        console.log(i)

        return res.status(200).json({
            id: i._id,
            orderDate: i.orderDate,
            customer: {
                _id: i.customerId._id,
                name: i.customerId.name,
                email: i.customerId.email
            },
            products: i.products?.map((item) => ({
                _id: item.productId._id,
                name: item.productId.name,
                price: item.productId.price,
                quantity: item.quantity
            })) ?? [],
            totalPrice: i.totalPrice,
        });
    } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Server error" });
    }
};

const q4 = async (req, res) => {
    try {

        const {
            customerId, products: items
        } = req.body

        // customer is dead or not?
        const c = await customers.findById(customerId).catch(() => null);

        if (!c) {
            return res.status(404).json({
                error: "Customer not found"
            });
        }

        // check valid stock
        for (let p of items) {

            console.log("p > ", p)

            const pdata = await products.findById(p.productId).catch(() => null);

            if (!pdata) {
                return res.status(409).json({
                    "error": "invalid product"
                });
            }

            if (pdata.stock < p.quantity) {
                return res.status(410).json({
                    "error": "invalid quantity"
                });
            }
        }

        let totalPrice = 0, productList = [];

        for (let p of items) {
            const pdata = await products.findById(p.productId).catch(() => null);

            pdata.stock -= p.quantity;

            productList.push({
                productId: pdata._id,
                quantity: p.quantity
            })

            totalPrice += pdata.price * p.quantity

            await pdata.save()
        }

        const newOrder = new orders({
            customerId,
            products: productList,
            totalPrice,
            orderDate: new Date()
        })

        await newOrder.save()

        return res.status(201).json(newOrder);
    } catch (e) {
        console.log(e)
        return res.status(500).json({ message: "Server error" });
    }
};

const q5 = async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await customers.findOne({ email, password }).catch(() => null);

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: customer._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "Server error" });
  }
};

const q6 = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authorization token is required"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const customer = await customers.findById(decoded.id).catch(() => null);

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        return res.status(200).json(customer);
    } catch (e) {
        console.log(e);

        if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "Invalid or expired token"
            });
        }

        return res.status(500).json({ message: "Server error" });
    }
};

const router = express.Router();

router.get('/api/products', q1);
router.get('/api/orders/customer/:customerId', q2);
router.get('/api/orders/:orderId', q3);
router.post('/api/orders/create', q4);

router.post('/api/customers/login', q5);
router.get('/api/customers/profile', q6);

module.exports = router;
