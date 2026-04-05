const winston = require("winston");

const isDev = process.env.NODE_ENV !== "production";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isDev ? winston.format.simple() : winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;
