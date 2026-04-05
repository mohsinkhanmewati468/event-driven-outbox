// src/models/Outbox.js
const mongoose = require("mongoose");

const outboxSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Outbox", outboxSchema);
