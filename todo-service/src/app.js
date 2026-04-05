require("dotenv").config();

const logger = require("./utils/logger");

require("./consumer/todo.consumer");

logger.info("Todo Service started...");
