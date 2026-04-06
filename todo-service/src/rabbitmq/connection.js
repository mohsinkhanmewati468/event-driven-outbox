const amqp = require("amqplib");
const logger = require("../utils/logger");

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    if (channel) return channel;

    logger.info("Connecting to RabbitMQ...");

    connection = await amqp.connect(process.env.RABBITMQ_URL);

    connection.on("close", () => {
      logger.error("RabbitMQ connection closed");

      // Reset state
      channel = null;
      connection = null;

      setTimeout(() => {
        logger.info("Restarting service to re-subscribe...");
        process.exit(1);
      }, 2000);
    });

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", err);
    });

    channel = await connection.createChannel();

    channel.prefetch(1);

    logger.info("RabbitMQ connected");

    return channel;
  } catch (err) {
    logger.error("RabbitMQ connection failed", err);

    // Retry connection after delay
    setTimeout(connectRabbitMQ, 5000);

    throw err;
  }
};

const getChannel = () => {
  if (!channel) {
    throw new Error("RabbitMQ not connected");
  }
  return channel;
};

const closeRabbitMQ = async () => {
  try {
    logger.info("Closing RabbitMQ connection...");

    if (channel) await channel.close();
    if (connection) await connection.close();

    channel = null;
    connection = null;

    logger.info("RabbitMQ closed");
  } catch (err) {
    logger.error("RabbitMQ close error", err);
  }
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  closeRabbitMQ,
};
