const amqp = require("amqplib");
const connectDB = require("../config/db");
const Todo = require("../models/Todo");
const logger = require("../utils/logger");

const EXCHANGE_NAME = "user.events";
const QUEUE_NAME = "USER_REGISTERED";
const ROUTING_KEY = "user.registered";
const DLQ_NAME = "USER_REGISTERED_DLQ";
const MAX_RETRIES = 3;

let connection;
let channel;

const startConsumer = async () => {
  try {
    await connectDB();

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    channel.prefetch(1);

    await channel.assertExchange(EXCHANGE_NAME, "direct", {
      durable: true,
    });

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": DLQ_NAME,
      },
    });

    await channel.assertQueue(DLQ_NAME, {
      durable: true,
    });

    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    logger.info("Todo Service listening (exchange mode)...");

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (!msg) return;

        const data = JSON.parse(msg.content.toString());
        const { userId } = data;

        try {
          logger.info("Received message", data);

          await Todo.updateOne(
            { userId, title: "Welcome to the App" },
            {
              $setOnInsert: {
                userId,
                title: "Welcome to the App",
              },
            },
            { upsert: true },
          );

          logger.info(`Welcome task ensured for user ${userId}`);

          channel.ack(msg);
        } catch (err) {
          const retries = msg.properties.headers?.retries || 0;

          logger.error("Error processing message", {
            userId,
            retries,
            error: err.message,
          });

          if (retries >= MAX_RETRIES) {
            logger.error("Max retries reached → DLQ");

            channel.nack(msg, false, false);
          } else {
            logger.warn(`Retrying (${retries + 1})`);

            channel.publish(EXCHANGE_NAME, ROUTING_KEY, msg.content, {
              persistent: true,
              headers: {
                retries: retries + 1,
              },
            });

            channel.ack(msg);
          }
        }
      },
      { noAck: false },
    );
  } catch (err) {
    logger.error("Consumer failed", err);

    // retry connection
    setTimeout(startConsumer, 5000);
  }
};

startConsumer();

// graceful shutdown
const shutdown = async () => {
  try {
    logger.info("Shutting down...");

    if (channel) await channel.close();
    if (connection) await connection.close();

    process.exit(0);
  } catch (err) {
    logger.error("Shutdown error", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
