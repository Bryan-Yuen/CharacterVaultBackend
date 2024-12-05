import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../index";
import { GraphQLError } from "graphql";
import logger from "../config/logger";
//const ONE_DAY = 60 * 60 * 24

const rateLimit: (limit?: number, seconds?: number) => MiddlewareFn<MyContext> = (limit = 100, seconds = 60 * 60 * 24) => async ({ context: { req, redis }, info }, next) => {
  const key = `rate-limit:${info.fieldName}:${req.ip}`;

  // Lua script to increment the counter and set the expiration atomically
  const luaScript = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return current
  `;

  try {
    // Execute the Lua script atomically
    const current = await redis.eval(luaScript, 1, key, seconds);

    // Check if the limit has been exceeded
    if (typeof current !== 'number') {
      logger.error("Unexpected result from rate limit script.", {
        "reqIp" : req.ip,
      });
      throw new GraphQLError("Unexpected result from rate limit script.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    // Check if the limit has been exceeded
    if (current > limit) {
      throw new GraphQLError("Maximum number of requests reached.", {
        extensions: { code: "RATE_LIMIT_ERROR" },
      });
    }

    return next();
  } catch (error) {
    // Handle any errors
    if (error instanceof GraphQLError) {
      throw error;
    }
    logger.error("Rate limit error occurred", {
      "reqIp" : req.ip,
    });
    throw new GraphQLError("Rate limit error occurred", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }
};

export default rateLimit