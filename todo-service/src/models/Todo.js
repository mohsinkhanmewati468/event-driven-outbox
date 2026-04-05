const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

todoSchema.index({ userId: 1, title: 1 }, { unique: true });

module.exports = mongoose.model("Todo", todoSchema);
