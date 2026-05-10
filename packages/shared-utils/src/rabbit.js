import amqp from "amqplib";
import { env } from "./config.js";

export const EXCHANGE = "hotel.events";

export async function connectRabbit(serviceName) {
  const url = env("RABBITMQ_URL", "amqp://localhost:5672");
  let lastError;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const connection = await amqp.connect(url);
      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });
      console.log(`${serviceName} connected to RabbitMQ`);
      return { connection, channel };
    } catch (error) {
      lastError = error;
      console.log(`${serviceName} waiting for RabbitMQ (${attempt}/20)`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

export async function publishEvent(channel, routingKey, event) {
  const payload = Buffer.from(JSON.stringify(event));
  channel.publish(EXCHANGE, routingKey, payload, {
    contentType: "application/json",
    persistent: true,
    messageId: event.eventId,
    timestamp: Date.now()
  });
}

export async function consumeEvents(channel, queueName, routingKeys, handler) {
  await channel.assertQueue(queueName, { durable: true });
  for (const key of routingKeys) {
    await channel.bindQueue(queueName, EXCHANGE, key);
  }

  await channel.consume(queueName, async (message) => {
    if (!message) return;
    try {
      const event = JSON.parse(message.content.toString());
      await handler(event);
      channel.ack(message);
    } catch (error) {
      console.error(`Failed to process ${queueName} message`, error);
      channel.nack(message, false, false);
    }
  });
}
