import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function redisError(
  resolver: string,
  redis_method: string,
  error: any,
  user_id?: number | undefined,
): never {
  logger.error(`Redis ${redis_method} operation error`, {
    resolver,
    redis_method,
    error,
    user_id : user_id || undefined
  });
  throw new GraphQLError("Internal server error.", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
