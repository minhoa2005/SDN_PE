const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  }
});

const Categories = mongoose.model("Category", categorySchema);
module.exports = Categories;
