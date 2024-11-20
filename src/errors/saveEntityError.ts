import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function saveEntityrror(
  resolver: string,
  entity: string,
  user_id: number | undefined,
  entity_object: any,
  error: any
): never {
  logger.error(`Error saving ${entity}`, {
    resolver,
    user_id,
    entity_object,
    error,
  });
  throw new GraphQLError("Internal server error.", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}
