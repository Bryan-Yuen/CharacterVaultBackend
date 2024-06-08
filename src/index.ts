import { ApolloServer } from "@apollo/server";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { PornstarResolver } from "./resolvers/pornstar";
import { UserTagResolver } from "./resolvers/userTag";
import { ContactResolver } from "./resolvers/contact";
import { PaymentResolver } from "./resolvers/payment";
import "reflect-metadata";
import myFormatError from "./utilities/errorFormatter";
import AppDataSource from "./config/db";
import Redis from "ioredis";
import session, { Session } from "express-session";
import RedisStore from "connect-redis";
import cors from "cors";
import { Worker } from "bullmq";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express, { Request, Response } from "express";
import http from "http";
import { cancelSubscriptionJob } from "./jobs/CancelSubscriptionJob";
import { checkSubscriptionStatusJob } from "./jobs/CheckSubscriptionStatusJob";
import "dotenv/config";

const bullMQRedisConnectionSettings = {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
};

export type MyContext = {
  req: Request & { session?: Session & { userId?: number } };
  res: Response;
  redis: Redis;
};

const startServer = async () => {
  await AppDataSource.initialize();

  const app = express();

  const redisClient = new Redis();

  redisClient.on("error", (error) => {
    console.error("Redis connection error:", error);
  });

  // Create a BullMQ worker
  const cancelSubscriptionWorker = new Worker(
    "cancelSubscriptionQueue",
    cancelSubscriptionJob,
    bullMQRedisConnectionSettings
  );

  const checkSubscriptionStatusWorker = new Worker(
    "checkSubscriptionStatusQueue",
    checkSubscriptionStatusJob,
    bullMQRedisConnectionSettings
  );

  // Event listeners for worker events
  cancelSubscriptionWorker.on("completed", (job) => {
    console.log(`${job.id} has completed!`);
  });

  cancelSubscriptionWorker.on("failed", (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
  });

  // Event listeners for worker events
  checkSubscriptionStatusWorker.on("completed", (job) => {
    console.log(`${job.id} has completed!`);
  });

  checkSubscriptionStatusWorker.on("failed", (job, err) => {
    console.log(`${job?.id} has failed with ${err.message}`);
  });

  app.use(
    cors({
      origin: process.env.PRODUCTION ? ["https://myfapsheettestingwebsite.us"] : ["http://localhost:3000", "http://192.168.0.208:3000"],
      //origin: ['http://localhost:3000',],
      credentials: true,
    })
  );

  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET environment variable is not defined');
  }
  app.use(
    session({
      name: "fap",
      secret: process.env.COOKIE_SECRET,
      store: new RedisStore({
        client: redisClient,
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
      },
    })
  );

  const httpServer = http.createServer(app);

  const server = new ApolloServer<MyContext>({
    schema: await buildSchema({
      resolvers: [
        UserResolver,
        PornstarResolver,
        UserTagResolver,
        ContactResolver,
        PaymentResolver,
      ],
      // you need this to be true to use class-validator decorators
      validate: { forbidUnknownValues: false },
    }),
    formatError: myFormatError,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  app.use(
    "/",
    // expressMiddleware accepts the same arguments:
    // an Apollo Server instance and optional configuration options
    express.json(),
    //cors<cors.CorsRequest>(),
    expressMiddleware(server, {
      context: async ({ req, res }) => ({ req, res, redis: redisClient }),
    })
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:4000/`);
};
startServer();
