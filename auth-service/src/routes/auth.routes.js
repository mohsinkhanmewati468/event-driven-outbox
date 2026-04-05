// src/routes/auth.routes.js
const express = require("express");
const router = express.Router();

const validateBody = require("../middlewares/validate");
const { registerSchema } = require("../validator/auth.validator");
const { registerUser } = require("../controllers/auth.controller");

router.post("/register", validateBody(registerSchema), registerUser);

module.exports = router;
