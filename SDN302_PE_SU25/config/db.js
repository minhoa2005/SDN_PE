const mongoose = require('mongoose');
const Users = require('../models/users');
const Events = require('../models/events');
const Bookings = require('../models/bookings');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error("MongoDB connection failed: ", error);
        process.exit(1);
    }
};

module.exports = {
    connectDB,
    Users,
    Events,
    Bookings
};