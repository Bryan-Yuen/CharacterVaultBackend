import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function r2Error(
  resolver: string,
  redis_method: string,
  user_id: number | undefined,
  error: any,
): never {
  if (error instanceof GraphQLError) {
    throw error;
  }
  logger.error(`R2 ${redis_method} operation error`, {
    resolver,
    redis_method,
    user_id : user_id || undefined,
    error,
  });
  throw new GraphQLError("Internal server error.", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
