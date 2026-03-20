const mongoose = require("mongoose");

const categorieSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  name: {
    type: String,
  },
  description: {
    type: String,
  }
});

module.exports = mongoose.model("Categorie", categorieSchema);
