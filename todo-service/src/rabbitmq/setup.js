const { getChannel } = require("./connection");

const EXCHANGE_NAME = "user.events";
const QUEUE_NAME = "USER_REGISTERED";
const ROUTING_KEY = "user.registered";
const DLQ_NAME = "USER_REGISTERED_DLQ";

const setupRabbitMQ = async () => {
  const channel = getChannel();

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
};

module.exports = {
  setupRabbitMQ,
  EXCHANGE_NAME,
  QUEUE_NAME,
  ROUTING_KEY,
};
