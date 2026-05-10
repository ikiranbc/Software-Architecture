import mongoose from "mongoose";
import { env } from "./config.js";

export async function connectMongo(serviceName) {
  mongoose.set("strictQuery", true);
  const uri = env("MONGO_URI");
  let lastError;

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      await mongoose.connect(uri);
      console.log(`${serviceName} connected to MongoDB`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`${serviceName} waiting for MongoDB (${attempt}/15)`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}
