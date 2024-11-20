import winston from "winston";
import { Loggly } from "winston-loggly-bulk";

if (!process.env.LOGGLY_TOKEN) {
  throw new Error("LOGGLY_TOKEN environment variable is not defined");
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "MyFapSheet" },
  transports: [],
});

if (process.env.NODE_ENV === "production") {
  logger.add(
    new Loggly({
      token: process.env.LOGGLY_TOKEN,
      subdomain: "myfapsheet",
      tags: ["Winston-NodeJS"],
      json: true,
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
      level: "debug",
    })
  );
}

export default logger;
