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

let isProcessing = false;

const startRelayWorker = async () => {
  try {
    await connectDB();
    await connectRabbitMQ();

    logger.info("Relay Worker started");

    // Run every 5 seconds
    cron.schedule("*/5 * * * * *", processEvents);
  } catch (error) {
    logger.error("Relay Worker startup failed", error);
    process.exit(1);
  }
};

const processEvents = async () => {
  if (isProcessing) return;

  isProcessing = true;

  try {
    const events = await fetchPendingEvents();

    if (events.length === 0) {
      logger.debug("No pending events");
      return;
    }

    logger.info(`Processing ${events.length} events`);

    for (const event of events) {
      await processSingleEvent(event);
    }
  } catch (error) {
    logger.error("Error processing events", error);
  } finally {
    isProcessing = false;
  }
};

const fetchPendingEvents = async () => {
  return Outbox.find({ status: "PENDING" }).sort({ createdAt: 1 }).limit(10);
};

const processSingleEvent = async (event) => {
  try {
    const channel = getChannel();

    if (!channel) {
      logger.warn("Channel not available, skipping event");
      return;
    }

    const message = Buffer.from(JSON.stringify(event.payload));

    channel.publish(EXCHANGE_NAME, ROUTING_KEY, message, { persistent: true });

    await channel.waitForConfirms();

    await markEventAsSent(event._id);

    logger.info(`Event sent: ${event._id}`);
  } catch (error) {
    logger.error(`Failed to send event ${event._id}`, error);
  }
};

const markEventAsSent = async (eventId) => {
  return Outbox.findOneAndUpdate(
    { _id: eventId, status: "PENDING" },
    { status: "SENT" },
  );
};

startRelayWorker();
