const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      quantity: {
        type: Number,
      }
    }
  ],
  totalPrice: {
    type: Number,
  },
  orderDate: {
    type: Date,
  }
});

module.exports = mongoose.model("Order", orderSchema);
