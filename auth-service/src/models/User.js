const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    logger.info(`Password hashed for user: ${this.email}`);
  } catch (err) {
    logger.error(
      `Error hashing password for user ${this.email}: ${err.message}`,
    );
    throw err;
  }
});
userSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret.password; // remove password
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
