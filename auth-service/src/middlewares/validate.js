const Joi = require("joi");
const CustomError = require("../utils/custom.error");

const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    throw new CustomError(error.details[0].message, 400);
  }
  next();
};

module.exports = validateBody;
