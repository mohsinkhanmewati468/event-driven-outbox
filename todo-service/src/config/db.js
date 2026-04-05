const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected succesfully");
  } catch (err) {
    logger.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
};

module.exports = connectDB;
