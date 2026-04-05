require("dotenv").config();
const cron = require("node-cron");
const Outbox = require("../models/Outbox");
const connectDB = require("../config/db");
const logger = require("../utils/logger");

const {
  connectRabbitMQ,
  getChannel,
  EXCHANGE_NAME,
  ROUTING_KEY,
} = require("../utils/rabbitmq");

let channel;

const startRelayWorker = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    channel = getChannel();

    logger.info("Relay Worker started...");

    cron.schedule("*/5 * * * * *", processEvents);
  } catch (err) {
    logger.error("Relay Worker failed", err);
    process.exit(1);
  }
};

let isProcessing = false;

const processEvents = async () => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const events = await Outbox.find({ status: "PENDING" })
      .sort({ createdAt: 1 })
      .limit(10);

    logger.info(`Processing ${events.length} events`);

    for (const event of events) {
      try {
        const message = Buffer.from(JSON.stringify(event.payload));

        await new Promise((resolve, reject) => {
          channel.publish(
            EXCHANGE_NAME,
            ROUTING_KEY,
            message,
            { persistent: true },
            (err, ok) => {
              if (err) return reject(err);
              resolve(ok);
            },
          );
        });

        await Outbox.findOneAndUpdate(
          { _id: event._id, status: "PENDING" },
          { status: "SENT" },
        );

        logger.info(`Event sent: ${event._id}`);
      } catch (err) {
        logger.error(`Error sending event ${event._id}`, err);
      }
    }
  } catch (err) {
    logger.error("Error processing events", err);
  } finally {
    isProcessing = false;
  }
};

startRelayWorker();
