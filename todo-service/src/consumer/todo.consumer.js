const connectDB = require("../config/db");
const Todo = require("../models/Todo");
const logger = require("../utils/logger");

const {
  connectRabbitMQ,
  getChannel,
  closeRabbitMQ,
} = require("../rabbitmq/connection");

const {
  setupRabbitMQ,
  QUEUE_NAME,
  EXCHANGE_NAME,
  ROUTING_KEY,
} = require("../rabbitmq/setup");

const MAX_RETRIES = 3;

const startConsumer = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();
    await setupRabbitMQ();

    const channel = getChannel();

    logger.info("Todo Service listening...");

    channel.consume(QUEUE_NAME, handleMessage, { noAck: false });
  } catch (error) {
    logger.error("Consumer startup failed", error);

    // retry startup
    setTimeout(startConsumer, 5000);
  }
};

const handleMessage = async (msg) => {
  if (!msg) return;

  const channel = getChannel(); //always fresh

  try {
    const data = parseMessage(msg);
    if (!data) return ack(channel, msg);

    const { userId } = data;

    if (!userId) {
      logger.error("Missing userId → discarding message", data);
      return ack(channel, msg);
    }

    await processTodo(userId);

    logger.info(`Welcome task ensured for user ${userId}`);

    ack(channel, msg);
  } catch (error) {
    await handleProcessingError(channel, msg, error);
  }
};

const parseMessage = (msg) => {
  try {
    return JSON.parse(msg.content.toString());
  } catch (error) {
    logger.error("Invalid JSON → discarding message", {
      error: error.message,
    });
    return null;
  }
};

//Create todo (idempotent)
const processTodo = async (userId) => {
  return Todo.updateOne(
    { userId, title: "Welcome to the App" },
    {
      $setOnInsert: {
        userId,
        title: "Welcome to the App",
      },
    },
    { upsert: true },
  );
};

const handleProcessingError = async (channel, msg, error) => {
  const data = safeParse(msg);
  const retries = msg.properties.headers?.retries || 0;

  logger.error("Processing failed", {
    userId: data?.userId,
    retries,
    error: error.message,
  });

  if (retries >= MAX_RETRIES) {
    logger.error("Max retries reached → DLQ");
    return channel.nack(msg, false, false);
  }

  try {
    channel.publish(EXCHANGE_NAME, ROUTING_KEY, msg.content, {
      persistent: true,
      headers: { retries: retries + 1 },
    });

    ack(channel, msg);

    logger.warn(`retrying (${retries + 1})`);
  } catch (pubError) {
    logger.error("Retry publish failed → will re-deliver", {
      error: pubError.message,
    });
  }
};

const safeParse = (msg) => {
  try {
    return JSON.parse(msg.content.toString());
  } catch {
    return null;
  }
};

const ack = (channel, msg) => {
  channel.ack(msg);
};

startConsumer();

const shutdown = async () => {
  try {
    logger.info("Shutting down...");
    await closeRabbitMQ();
    process.exit(0);
  } catch (error) {
    logger.error("Shutdown error", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
