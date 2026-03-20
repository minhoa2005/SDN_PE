const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  price: {
    type: Number,
  },
  stock: {
    type: Number,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
  }
});

module.exports = mongoose.model("Product", productSchema);
