import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function transactionFailedError(
  resolver: string,
  entity: string,
  user_id: number | undefined,
  entity_id: number | undefined,
  error: any
): never {
  logger.error(`Transaction failed updating: ${entity} with entity_id: ${entity_id}`, {
    resolver,
    user_id,
    entity_id,
    error
  });
  throw new GraphQLError("Internal server error.", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
