const amqp = require("amqplib");
const logger = require("./logger");

let channel = null;
let connection = null;

const EXCHANGE_NAME = "user.events";
const ROUTING_KEY = "user.registered";

const connectRabbitMQ = async () => {
  try {
    logger.info("Connecting to RabbitMQ...");

    connection = await amqp.connect(process.env.RABBITMQ_URL);

    connection.on("close", () => {
      logger.error("RabbitMQ connection closed. Reconnecting...");
      reconnect();
    });

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", err);
    });

    channel = await connection.createConfirmChannel();

    // ✅ ONLY EXCHANGE
    await channel.assertExchange(EXCHANGE_NAME, "direct", {
      durable: true,
    });

    logger.info("RabbitMQ connected (producer ready)");
  } catch (err) {
    logger.error("RabbitMQ connection failed", err);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const reconnect = async () => {
  channel = null;
  connection = null;
  await connectRabbitMQ();
};

const getChannel = () => {
  if (!channel) throw new Error("Channel not initialized");
  return channel;
};

module.exports = {
  connectRabbitMQ,
  getChannel,
  EXCHANGE_NAME,
  ROUTING_KEY,
};
