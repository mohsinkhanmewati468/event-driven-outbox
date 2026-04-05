const User = require("../models/User");
const Outbox = require("../models/Outbox");
const mongoose = require("mongoose");
const CustomError = require("../utils/custom.error");

const registerUser = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    if (!req.body) {
      throw new CustomError("Email and password are required", 400);
    }

    const { email, password } = req.body;

    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new CustomError("Email already exists", 400);
    }

    const user = await User.create([{ email, password }], { session });

    await Outbox.create(
      [
        {
          eventType: "USER_REGISTERED",
          payload: {
            userId: user[0]._id,
            email,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user[0],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    next(err);
  } finally {
    session.endSession();
  }
};

module.exports = { registerUser };
