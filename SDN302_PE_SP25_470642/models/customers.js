const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  address: {
    type: String,
  },
  phone: {
    type: mongoose.Schema.Types.Mixed,
  }
});

const Customers = mongoose.model("Customer", customerSchema);
module.exports = Customers;
