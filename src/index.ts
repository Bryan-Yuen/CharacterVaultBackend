import { ApolloServer } from "@apollo/server";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/user";
import { PornstarResolver } from "./resolvers/pornstar";
import { UserTagResolver } from "./resolvers/userTag";
import { ContactResolver } from "./resolvers/contact";
import "reflect-metadata";
import myFormatError from "./utilities/errorFormatter";
import AppDataSource from "./config/db";
import Redis from "ioredis";
import session, { Session } from "express-session";
import RedisStore from "connect-redis";
import cors from "cors";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express, { Request, Response } from "express";
import http from "http";
import helmet from "helmet";
import "dotenv/config";
// hello123

if (process.env.NODE_ENV === "PRODUCTION" && !process.env.PRODUCTION_URL) {
  throw new Error("production url not defined");
}

if (!process.env.PORT) {
  throw new Error("no port defined");
}

export type MyContext = {
  req: Request & {
    session?: Session & { userId?: number; verified?: boolean };
  };
  res: Response;
  redis: Redis;
};

const startServer = async () => {
  try {
    await AppDataSource.initialize();

    const app = express();

    const redisClient = new Redis();

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    app.use(helmet());

    app.use(
      cors({
        // stupid typescript compile error forced me to use || "" even though i have typecheck up there and types in environment types file
        origin:
          process.env.NODE_ENV === "PRODUCTION"
            ? [process.env.PRODUCTION_URL || ""]
            : ["http://localhost:3000", process.env.DEVELOPMENT_URL || ""],
        credentials: true,
      })
    );

    if (!process.env.COOKIE_SECRET) {
      throw new Error("COOKIE_SECRET environment variable is not defined");
    }

    app.use(
      session({
        name: "myfapsheet-session",
        secret: process.env.COOKIE_SECRET,
        store: new RedisStore({
          client: redisClient,
        }),
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 90, // 3 months in milliseconds
          httpOnly: true,
          secure: process.env.NODE_ENV === "PRODUCTION",
          sameSite: "strict",
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

    const port = process.env.PORT;
    await new Promise<void>((resolve) =>
      httpServer.listen({ port: port }, resolve)
    );
    console.log(`🚀 Server ready at http://localhost:${port}/`);
    console.log("Node env is: " + process.env.NODE_ENV);
  } catch (error) {
    console.log("error", error);
  }
};
startServer();
